from django.apps import AppConfig

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        # Bootstraps initial seed if necessary
        try:
            from .models import init_defaults
            init_defaults()
        except Exception:
            pass
