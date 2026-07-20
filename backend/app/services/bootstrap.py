from sqlalchemy import inspect, select, text
from sqlalchemy.orm import Session

from app.core.settings import get_settings
from app.models.product import Product
from app.models.product_category import ProductCategory
from app.models.restaurant import Restaurant
from app.models.role import Role
from app.models.settings import RestaurantSettings
from app.models.user import User
from app.services.security import hash_password


DEFAULT_ROLES = (
    ("admin", "Administrador"),
    ("waiter", "Mesero"),
    ("kitchen", "Cocina"),
)

DEFAULT_MENU = (
    (
        "Tacos",
        0,
        (
            ("Campechano", 30.0, "Taco mixto de la casa"),
            ("Longaniza", 30.0, None),
            ("Bistec", 30.0, None),
            ("Adobada", 30.0, None),
            ("Suadero", 30.0, None),
            ("Costilla", 40.0, None),
        ),
    ),
    (
        "Antojitos mexicanos",
        1,
        (
            ("Enchiladas de pollo", 60.0, "4 pzas"),
            ("Tacos dorados de pollo", 50.0, "4 pzas"),
            ("Tostada de tinga", 35.0, None),
        ),
    ),
    (
        "Bebidas",
        2,
        (
            ("Refresco de vidrio", 25.0, None),
            ("Refresco 600 ml", 30.0, None),
            ("Agua natural 1L", 15.0, None),
            ("Agua de sabor 1/2L", 15.0, None),
            ("Agua de sabor 1L", 25.0, None),
        ),
    ),
)

CATALOG_CATEGORY_NAMES = tuple(category_name for category_name, _, _ in DEFAULT_MENU)


def bootstrap_initial_data(db: Session) -> dict[str, int | bool]:
    settings = get_settings()

    db.execute(text("ALTER TABLE IF EXISTS products DROP CONSTRAINT IF EXISTS uq_products_restaurant_name"))
    inspector = inspect(db.get_bind())
    unique_constraints = {constraint["name"] for constraint in inspector.get_unique_constraints("products")}
    if "uq_products_restaurant_category_name" not in unique_constraints:
        db.execute(
            text(
                "ALTER TABLE products "
                "ADD CONSTRAINT uq_products_restaurant_category_name "
                "UNIQUE (restaurant_id, category_id, name)"
            )
        )

    restaurant = db.scalar(select(Restaurant).limit(1))
    created = False

    if restaurant is None:
        restaurant = Restaurant(name=settings.initial_restaurant_name)
        db.add(restaurant)
        db.flush()
        created = True

    restaurant_settings = db.scalar(select(RestaurantSettings).where(RestaurantSettings.restaurant_id == restaurant.id))
    if restaurant_settings is None:
        db.add(
            RestaurantSettings(
                restaurant_id=restaurant.id,
                business_name=settings.initial_business_name,
                currency_code="MXN",
                tax_rate=0.0,
                receipt_footer=None,
                table_label_singular="Mesa",
                table_label_plural="Mesas",
            )
        )
        created = True

    roles_by_code: dict[str, Role] = {role.code: role for role in db.scalars(select(Role).where(Role.restaurant_id == restaurant.id))}
    for code, label in DEFAULT_ROLES:
        if code not in roles_by_code:
            role = Role(restaurant_id=restaurant.id, code=code, label=label)
            db.add(role)
            db.flush()
            roles_by_code[code] = role
            created = True

    admin_role = roles_by_code["admin"]
    admin_user = db.scalar(
        select(User).where(
            User.restaurant_id == restaurant.id,
            User.username == settings.initial_admin_username,
        )
    )
    if admin_user is None:
        admin_user = User(
            restaurant_id=restaurant.id,
            role_id=admin_role.id,
            username=settings.initial_admin_username,
            full_name=settings.initial_admin_full_name,
            password_hash=hash_password(settings.initial_admin_password),
            is_active=True,
        )
        db.add(admin_user)
        created = True

    categories_by_name: dict[str, ProductCategory] = {
        category.name: category
        for category in db.scalars(select(ProductCategory).where(ProductCategory.restaurant_id == restaurant.id))
    }
    for category_name, sort_order, products in DEFAULT_MENU:
        category = categories_by_name.get(category_name)
        if category is None:
            category = ProductCategory(
                restaurant_id=restaurant.id,
                name=category_name,
                sort_order=sort_order,
            )
            db.add(category)
            db.flush()
            categories_by_name[category_name] = category
            created = True
        elif category.sort_order != sort_order:
            category.sort_order = sort_order

        existing_products = {
            product.name
            for product in db.scalars(
                select(Product).where(
                    Product.restaurant_id == restaurant.id,
                    Product.category_id == category.id,
                )
            )
        }
        for product_sort, (product_name, price, description) in enumerate(products):
            if product_name in existing_products:
                continue
            db.add(
                Product(
                    restaurant_id=restaurant.id,
                    category_id=category.id,
                    name=product_name,
                    description=description,
                    price=price,
                    is_active=True,
                    sort_order=product_sort,
                )
            )
            created = True

    db.commit()
    return {"restaurant_id": restaurant.id, "admin_user_id": admin_user.id, "created": created}
