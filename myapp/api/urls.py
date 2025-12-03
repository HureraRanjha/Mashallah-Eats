from django.urls import path
from .views import index, DishListView, LoginUser


urlpatterns = [
    path("index/", index),   # → /api/index/
    path("browse/", DishListView, name="dishes-list"),
    path("login/", LoginUser.as_view() , name ="login")
]