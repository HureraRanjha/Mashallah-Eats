from django.urls import path
from .views import index, DishListView, LoginUser, Discussions, create_reply, create_topic, order_food, food_review, add_menu, create_delivery_bid, get_delivery_bids, assign_delivery, delivery_rating, RegisterUser, create_deposit_intent, confirm_deposit, file_complaint, get_complaints, process_complaint, file_compliment, get_compliments, process_compliment, order_history, blacklist_user, get_profile

urlpatterns = [
    path("index/", index),   # → /api/index/
    path("browse/", DishListView, name="dishes-list"),
    path("login/", LoginUser, name="login"),
    path("register/", RegisterUser, name="register"),
    path("discussion_board/", Discussions, name="discussion_board"),
    path("reply/", create_reply, name="reply"),
    path("topic/", create_topic, name="topic"),
    path("order/", order_food, name="order"),
    path("review_food/", food_review, name="review_food"),
    path("add_item/", add_menu, name="add_item"),
    path("bid/", create_delivery_bid, name="create_bid"),
    path("bids/", get_delivery_bids, name="get_bids"),
    path("assign_delivery/", assign_delivery, name="assign_delivery"),
    path("review_driver/", delivery_rating, name="review_Driver"),
    path("deposit/create/", create_deposit_intent, name="create_deposit"),
    path("deposit/confirm/", confirm_deposit, name="confirm_deposit"),
    path("complaint/", file_complaint, name="file_complaint"),
    path("complaints/", get_complaints, name="get_complaints"),
    path("complaint/process/", process_complaint, name="process_complaint"),
    path("compliment/", file_compliment, name="file_compliment"),
    path("compliments/", get_compliments, name="get_compliments"),
    path("orders/history/", order_history, name="order_history"),
    path("blacklist/", blacklist_user, name="blacklist"),
    path("compliment/process/", process_compliment, name="process_compliment"),
    path("profile/", get_profile, name="profile"),
]