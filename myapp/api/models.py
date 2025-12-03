from django.db import models

class MenuItem(models.Model):
    id = models.AutoField(primary_key=True)   # <-- NORMAL ID, not BigAutoField
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.FloatField()

class TestItem(models.Model):
    title = models.CharField(max_length=100)
    qty = models.IntegerField(default=0)
