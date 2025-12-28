import os
import sys
from cryptography.fernet import Fernet

# Load ENCRYPTION_KEY from environment variable
# This is required for proper API key encryption/decryption
_key = os.getenv("ENCRYPTION_KEY")
if not _key:
    print("FATAL ERROR: ENCRYPTION_KEY environment variable not set!")
    print("Please set ENCRYPTION_KEY in your .env file before starting the server.")
    print("You can generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"")
    sys.exit(1)

try:
    cipher_suite = Fernet(_key.encode())
except Exception as e:
    print(f"FATAL ERROR: Invalid ENCRYPTION_KEY format. Error: {e}")
    print("ENCRYPTION_KEY must be a valid Fernet key.")
    sys.exit(1)

def encrypt_secret(secret: str) -> str:
    """Encrypts a string secret."""
    return cipher_suite.encrypt(secret.encode()).decode()

def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypts an encrypted secret string."""
    return cipher_suite.decrypt(encrypted_secret.encode()).decode()
