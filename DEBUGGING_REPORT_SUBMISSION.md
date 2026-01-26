# Dépannage - Erreur JSON lors de la soumission du rapport

## Problème
Lors de la soumission du formulaire de rapport depuis l'application mobile, vous recevez l'erreur:
```
JSON.parse: unexpected end of data at line 1 column 1 of the JSON data
```

## Cause
Le backend PHP n'est probablement pas en cours d'exécution sur le port 3001.

## Solution

### Étape 1: Lancer le Backend (Docker)
```bash
# Depuis la racine du projet
yarn docker:up
```

Cela lancera:
- **PostgreSQL** sur le port 5432
- **Backend API PHP** sur le port 3001
- **Serveur de cartes offline** sur le port 8080

Attendez ~30 secondes que PostgreSQL soit prêt.

### Étape 2: Vérifier que le backend est actif
```bash
curl http://localhost:3001/health
```

Vous devriez voir:
```json
{"status":"OK","timestamp":"2024-..."}
```

### Étape 3: Relancer l'application mobile
```bash
# Dans un nouveau terminal
yarn dev:mobile
```

Ensuite accédez à `http://localhost:8100` dans le navigateur.

### Étape 4: Soumettre un rapport
1. Allez à l'onglet "Signaler"
2. Remplissez les champs
3. Cliquez "ENVOYER LE SIGNALEMENT"

Le rapport devrait être créé avec succès (réponse 201 JSON).

## Alternative: Arrêter et Redémarrer

Si cela ne fonctionne toujours pas:
```bash
# Arrêter les conteneurs
yarn docker:down

# Redémarrer
yarn docker:up

# Consulter les logs
yarn docker:logs
```

## Vérification avancée

Regardez la console du navigateur (F12 → Console/Network):
- L'onglet Network devrait montrer une requête POST à `http://localhost:3001/api/reports`
- La réponse devrait avoir le status 201 avec un corps JSON

Si vous voyez "Connection refused" ou réponse vide, le backend n'est pas en cours d'exécution.

