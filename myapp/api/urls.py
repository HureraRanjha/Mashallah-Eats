from django.urls import path
from .views import index, DishListView, LoginUser, Discussions


urlpatterns = [
    path("index/", index),   # → /api/index/
    path("browse/", DishListView, name="dishes-list"),
    path("login/", LoginUser.as_view(), name="login"),
    path("register/", LoginUser.as_view(), name="register"),
    path("discussion_board/", Discussions, name="discussion_board"),
]