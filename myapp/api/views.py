from django.shortcuts import render
from django.http import HttpResponse
from .supabase_client import supabase
def index(request):
    return HttpResponse("Hello from the backend API")


def DishListView(request):
    response = supabase.table("Menuitem").select("*").execute()
    items = response.data
    print("TABLE TEST:", supabase.table("Menuitem").select("*").execute())
    return render(request, 'browse.html', {"items": items})