from django.urls import path, include

app_name = 'payments'

urlpatterns = [
    path('', include('payments.urls.__init__')),
]
