from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth.views import LoginView
from .models import MenuItem, DiscussionTopic, DiscussionPost
from django.http import JsonResponse
def index(request):
    return HttpResponse("Hello from the backend API")


def DishListView(request):
    items = list(MenuItem.objects.values())
    warnings = None
    
    user = request.user

    if user.is_authenticated and hasattr(user, "userprofile"):
        profile = user.userprofile

        if profile.user_type in ['registered', 'vip'] and hasattr(profile, "customerprofile"):
            warnings = profile.customerprofile.warnings_count
    return JsonResponse({
        "items": items,
        "warnings": warnings,
    })


def Discussions(request):
    titles = list(DiscussionTopic.objects.values())
    posts = list(DiscussionPost.objects.values())

    return JsonResponse({
        "titles": titles,
        "posts": posts
    })



class LoginUser(LoginView):
    template_name = "login.html"


