# Documentación

| Documento | Para quién | Contenido |
|---|---|---|
| [PENDIENTES.md](PENDIENTES.md) | Equipo / dueño | Errores, seguridad, marca y legal, infraestructura y escala, deuda técnica, mejoras futuras — todo verificado con evidencia |
| [MANUAL_USUARIO.md](MANUAL_USUARIO.md) | Usuarios | Cómo instalar y usar cada módulo |
| [ARQUITECTURA.md](ARQUITECTURA.md) | Desarrolladores | Stack, módulos, tablas, flujos, variables de entorno |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Desarrolladores | Local, producción, checklists de deploy y de lanzamiento, recuperación |
| [REVISION.md](REVISION.md) | Revisores | Checklist por cambio + resultado de la última auditoría |
| [DECISIONES.md](DECISIONES.md) | Todos | Por qué se decidió cada cosa importante |
| [../branding/README.md](../branding/README.md) | Diseño | Logo, colores, tipografía, reglas de uso |

## Reglas para mantener esta documentación

1. **Solo hechos verificados.** Todo pendiente lleva evidencia (archivo:línea, comando o prueba). Si no se pudo
   verificar, se marca *"por verificar"* — nunca se presenta como hecho.
2. **Se actualiza en el mismo cambio** que modifica el comportamiento (no después).
3. Lo resuelto no se borra: pasa a *Resueltos* en PENDIENTES con fecha y commit.
