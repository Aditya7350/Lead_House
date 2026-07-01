import os
from dotenv import load_dotenv
import requests

load_dotenv()

app_id = os.environ.get("CASHFREE_APP_ID")
secret = os.environ.get("CASHFREE_SECRET_KEY")

# Check for hidden whitespace/newlines/quotes that break auth silently
print("APP_ID repr:", repr(app_id))
print("SECRET repr:", repr(secret))
print("APP_ID length:", len(app_id) if app_id else None)
print("SECRET length:", len(secret) if secret else None)

r = requests.post(
    "https://sandbox.cashfree.com/pg/orders",
    headers={
        "x-client-id": app_id,
        "x-client-secret": secret,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
    },
    json={
        "order_id": "test123",
        "order_amount": 1.00,
        "order_currency": "INR",
        "customer_details": {
            "customer_id": "1",
            "customer_email": "test@test.com",
            "customer_phone": "9999999999",
        },
    },
)
print(r.status_code, r.json())