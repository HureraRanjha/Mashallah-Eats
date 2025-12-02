from django.urls import path
from .views import index, DishListView

urlpatterns = [
    path("index/", index),   # → /api/index/
    path("browse/", DishListView, name="dishes-list")
]