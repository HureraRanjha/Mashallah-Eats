from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.contrib.auth.views import LoginView
from .models import MenuItem
def index(request):
    return HttpResponse("Hello from the backend API")


def DishListView(request):
    items = MenuItem.objects.all()   # <-- Django ORM now
    return render(request, 'browse.html', {"items": items})


class LoginUser(LoginView):
    template_name = "login.html"