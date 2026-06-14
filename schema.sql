-- LIFE OS AI - Ejecutar en Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TYPE asset_type AS ENUM ("cash","investment","real_estate","business","crypto","other");
CREATE TYPE liability_type AS ENUM ("credit_card","personal_loan","mortgage","auto_loan","other");
CREATE TYPE swot_type AS ENUM ("strength","weakness","opportunity","threat");
-- Ver schema.sql completo en el script bash setup-life-os.sh
-- o ejecutar el script bash primero para obtener el schema completo.
-- El schema completo incluye todas las tablas y politicas RLS.