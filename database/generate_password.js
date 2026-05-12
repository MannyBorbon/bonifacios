// Script para generar hash de contraseña con bcrypt
// Ejecutar con: node generate_password.js

import bcrypt from 'bcrypt';

const password = process.env.DEFAULT_USER_PASSWORD || '';
const saltRounds = 10;

if (!password) {
  console.error('Falta DEFAULT_USER_PASSWORD en variables de entorno.');
  process.exit(1);
}

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Contraseña:', password);
  console.log('Hash bcrypt:', hash);
  console.log('\nCopia este hash para usar en el SQL:');
  console.log(hash);
});
