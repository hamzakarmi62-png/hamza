import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..db import create_user, get_user_by_username_or_email, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class LoginRequest(BaseModel):
    identifier: str
    password: str


@router.post("/register")
def register(req: RegisterRequest):
    try:
        existing_username = get_user_by_username_or_email(req.username)
        if existing_username:
            raise HTTPException(status_code=400, detail="اسم المستخدم مستخدم بالفعل")
        
        existing_email = get_user_by_username_or_email(req.email)
        if existing_email:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")

        user_id = uuid.uuid4().hex[:12]
        user = create_user(user_id, req.username, req.email, req.password)
        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في قاعدة البيانات أو الخادم: {str(e)}")


@router.post("/login")
def login(req: LoginRequest):
    try:
        user_row = get_user_by_username_or_email(req.identifier)
        if not user_row or not verify_password(user_row["password_hash"], req.password):
            raise HTTPException(status_code=401, detail="اسم المستخدم أو البريد الإلكتروني أو كلمة المرور غير صحيحة")

        return {
            "success": True,
            "user": {
                "id": user_row["id"],
                "username": user_row["username"],
                "email": user_row["email"],
                "created_at": user_row["created_at"],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في قاعدة البيانات أو الخادم: {str(e)}")
