# ⚠️ Permisos AWS Requeridos

## 🚨 Problema Detectado

El usuario IAM `Alfred` (arn:aws:iam::116981765080:user/Alfred) **NO tiene permisos** para crear recursos de AWS Rekognition.

### Error Específico
```
User: arn:aws:iam::116981765080:user/Alfred is not authorized to perform:
rekognition:CreateCollection on resource: arn:aws:rekognition:us-east-1:116981765080:collection/herdez-usuarios-faces
because no identity-based policy allows the rekognition:CreateCollection action
```

## ✅ Solución

Necesitas agregar los siguientes permisos al usuario IAM en la consola de AWS:

### Opción 1: Políticas Administradas de AWS (Más Fácil)

Agrega estas políticas administradas al usuario `Alfred`:

1. **AmazonRekognitionFullAccess**
   - Permite usar todas las funciones de Rekognition
   - ARN: `arn:aws:iam::aws:policy/AmazonRekognitionFullAccess`

2. **AmazonS3FullAccess**
   - Permite crear y gestionar buckets de S3
   - ARN: `arn:aws:iam::aws:policy/AmazonS3FullAccess`

### Opción 2: Política Personalizada (Más Seguro - Mínimos Permisos)

Crea una política IAM personalizada con estos permisos mínimos:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RekognitionPermissions",
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateCollection",
        "rekognition:DeleteCollection",
        "rekognition:DescribeCollection",
        "rekognition:ListCollections",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:DeleteFaces",
        "rekognition:ListFaces"
      ],
      "Resource": "*"
    },
    {
      "Sid": "S3BucketPermissions",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:PutBucketVersioning",
        "s3:PutBucketLifecycleConfiguration"
      ],
      "Resource": "arn:aws:s3:::herdez-concursos"
    },
    {
      "Sid": "S3ObjectPermissions",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::herdez-concursos/*"
    }
  ]
}
```

## 📋 Pasos para Agregar Permisos (Consola AWS)

### Para Políticas Administradas:

1. Ve a AWS Console → IAM
2. Busca el usuario `Alfred`
3. Ve a la pestaña "Permissions"
4. Click en "Add permissions" → "Attach policies directly"
5. Busca y selecciona:
   - ✅ `AmazonRekognitionFullAccess`
   - ✅ `AmazonS3FullAccess`
6. Click "Add permissions"

### Para Política Personalizada:

1. AWS Console → IAM → Policies
2. Click "Create policy"
3. Pestaña "JSON" → Pega la política de arriba
4. Click "Next" → Dale un nombre: `HerdezConcursosPolicy`
5. Click "Create policy"
6. Ve al usuario `Alfred` → "Add permissions"
7. Busca y adjunta `HerdezConcursosPolicy`

## 🔄 Después de Agregar Permisos

Una vez agregados los permisos, ejecuta:

```bash
# 1. Configurar AWS Rekognition y S3
node scripts/setup-rekognition-esm.js

# 2. Verificar que se crearon los recursos
# - Colección: herdez-usuarios-faces
# - Bucket S3: herdez-concursos

# 3. Iniciar el servidor backend
npm run server

# 4. Probar el sistema completo
```

## 💡 Alternativa: Crear Recursos Manualmente

Si no puedes modificar permisos IAM, puedes crear los recursos manualmente:

### Crear Colección de Rekognition:
1. AWS Console → Amazon Rekognition
2. Collections → Create collection
3. Nombre: `herdez-usuarios-faces`
4. Region: `us-east-1`

### Crear Bucket de S3:
1. AWS Console → Amazon S3
2. Create bucket
3. Nombre: `herdez-concursos`
4. Region: `us-east-1`
5. Dejar como privado

## ⚙️ Verificar Permisos Actuales

Para ver qué permisos tiene actualmente el usuario Alfred:

```bash
aws iam list-attached-user-policies --user-name Alfred
aws iam list-user-policies --user-name Alfred
```

## 📊 Estado Actual

| Recurso | Estado | Acción Requerida |
|---------|--------|------------------|
| ✅ Credenciales AWS | Válidas | Ninguna |
| ✅ Base de Datos | Creada | Ninguna |
| ✅ Backend | Listo | Ninguna |
| ❌ Rekognition Collection | No creada | Agregar permisos IAM |
| ❌ S3 Bucket | No creado | Agregar permisos IAM |

## 🎯 Próximos Pasos

**Opción A - CON permisos AWS:**
1. Agregar permisos IAM al usuario Alfred
2. Ejecutar `node scripts/setup-rekognition-esm.js`
3. Iniciar servidor y probar

**Opción B - SIN permisos AWS (crear manual):**
1. Crear colección Rekognition manualmente en consola
2. Crear bucket S3 manualmente en consola
3. Iniciar servidor y probar

**Opción C - Modo desarrollo SIN AWS:**
1. Comentar validación de AWS en server.js
2. Usar simulación de reconocimiento facial (desarrollo)
3. Configurar AWS más adelante para producción

---

**Última actualización**: 10 Nov 2024
**Cuenta AWS**: 116981765080
**Usuario IAM**: Alfred
**Región**: us-east-1
