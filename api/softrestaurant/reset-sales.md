# Reset de Ventas y Propinas

⚠️ PELIGROSO — borra todo el historial sincronizado. Copiar SOLO el bloque SQL de abajo en phpMyAdmin.

---

## SQL PARA PHPMYADMIN (copiar solo esto)

```
DELETE FROM sr_sale_items;
DELETE FROM sr_sales;
DELETE FROM sr_sync_log WHERE module_name = 'sales';
ALTER TABLE sr_sale_items AUTO_INCREMENT = 1;
ALTER TABLE sr_sales AUTO_INCREMENT = 1;
```

---

## Después del SQL

1. Borrar o vaciar el archivo: `C:\Sincronizador\softrestaurant-sync\sync-state.json`
2. Correr el sincronizador:
   ```
   cd C:\Sincronizador\softrestaurant-sync
   php sync-final.php
   ```

El sincronizador recargará todo el historial con `tip_paid` correcto desde `cheques.propinapagada`.
