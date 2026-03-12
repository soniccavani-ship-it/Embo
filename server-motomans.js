// ========================================
// SERVEUR GESTION MOTOMANS - SQLite3
// ========================================

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Connexion à la base de données
const db = new sqlite3.Database('./motomans.db', (err) => {
    if (err) {
        console.error('❌ Erreur de connexion:', err.message);
    } else {
        console.log('✅ Connecté à SQLite');
        initDatabase();
    }
});

// ========================================
// INITIALISATION BASE DE DONNÉES
// ========================================

function initDatabase() {
    // Table Motomans
    db.run(`CREATE TABLE IF NOT EXISTS motomans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        age INTEGER NOT NULL CHECK(age >= 18),
        carte_identite TEXT NOT NULL UNIQUE,
        numero_mairie TEXT NOT NULL,
        numero_telephone TEXT NOT NULL,
        date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('❌ Erreur création table:', err);
        } else {
            console.log('✅ Table motomans créée');
            
            // Insérer des données de test
            db.get('SELECT COUNT(*) as count FROM motomans', (err, row) => {
                if (row.count === 0) {
                    insertTestData();
                }
            });
        }
    });
}

function insertTestData() {
    const stmt = db.prepare(`
        INSERT INTO motomans (nom, prenom, age, carte_identite, numero_mairie, numero_telephone) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const testMotomans = [
        ['Nguema', 'Jean', 28, 'CNI123456', 'MAI001', '677123456'],
        ['Mbarga', 'Paul', 35, 'CNI789012', 'MAI002', '655987654'],
        ['Nkolo', 'Pierre', 42, 'CNI345678', 'MAI003', '699456789'],
        ['Ateba', 'Thomas', 30, 'CNI901234', 'MAI004', '670321654'],
        ['Essomba', 'Michel', 26, 'CNI567890', 'MAI005', '688654321']
    ];

    testMotomans.forEach(motoman => {
        stmt.run(motoman);
    });

    stmt.finalize();
    console.log('✅ Données de test insérées');
}

// ========================================
// API ENDPOINTS - CRUD COMPLET
// ========================================

// CREATE - Ajouter un motoman
app.post('/api/motomans', (req, res) => {
    const { nom, prenom, age, carte_identite, numero_mairie, numero_telephone } = req.body;

    // Validation
    if (!nom || !prenom || !age || !carte_identite || !numero_mairie || !numero_telephone) {
        return res.status(400).json({
            success: false,
            error: 'Tous les champs sont obligatoires'
        });
    }

    if (age < 18) {
        return res.status(400).json({
            success: false,
            error: 'Le motoman doit avoir au moins 18 ans'
        });
    }

    const query = `
        INSERT INTO motomans (nom, prenom, age, carte_identite, numero_mairie, numero_telephone) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [nom, prenom, age, carte_identite, numero_mairie, numero_telephone], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({
                    success: false,
                    error: 'Cette carte d\'identité existe déjà'
                });
            }
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        console.log(`✅ Motoman ajouté : ${prenom} ${nom} (ID: ${this.lastID})`);

        res.json({
            success: true,
            id: this.lastID,
            message: 'Motoman ajouté avec succès'
        });
    });
});

// READ - Tous les motomans
app.get('/api/motomans', (req, res) => {
    db.all('SELECT * FROM motomans ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

// READ - Un motoman par ID
app.get('/api/motomans/:id', (req, res) => {
    const id = req.params.id;

    db.get('SELECT * FROM motomans WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                error: 'Motoman non trouvé'
            });
        }

        res.json({
            success: true,
            data: row
        });
    });
});

// UPDATE - Modifier un motoman
app.put('/api/motomans/:id', (req, res) => {
    const id = req.params.id;
    const { nom, prenom, age, carte_identite, numero_mairie, numero_telephone } = req.body;

    // Validation
    if (!nom || !prenom || !age || !carte_identite || !numero_mairie || !numero_telephone) {
        return res.status(400).json({
            success: false,
            error: 'Tous les champs sont obligatoires'
        });
    }

    if (age < 18) {
        return res.status(400).json({
            success: false,
            error: 'Le motoman doit avoir au moins 18 ans'
        });
    }

    const query = `
        UPDATE motomans 
        SET nom = ?, prenom = ?, age = ?, carte_identite = ?, numero_mairie = ?, numero_telephone = ? 
        WHERE id = ?
    `;

    db.run(query, [nom, prenom, age, carte_identite, numero_mairie, numero_telephone, id], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({
                    success: false,
                    error: 'Cette carte d\'identité existe déjà'
                });
            }
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Motoman non trouvé'
            });
        }

        console.log(`✏️ Motoman modifié : ID ${id} - ${prenom} ${nom}`);

        res.json({
            success: true,
            message: 'Motoman mis à jour avec succès',
            changes: this.changes
        });
    });
});

// DELETE - Supprimer un motoman
app.delete('/api/motomans/:id', (req, res) => {
    const id = req.params.id;

    // Récupérer les infos avant suppression
    db.get('SELECT * FROM motomans WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        if (!row) {
            return res.status(404).json({
                success: false,
                error: 'Motoman non trouvé'
            });
        }

        // Supprimer
        db.run('DELETE FROM motomans WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({
                    success: false,
                    error: err.message
                });
            }

            console.log(`🗑️ Motoman supprimé : ID ${id} - ${row.prenom} ${row.nom}`);

            res.json({
                success: true,
                message: 'Motoman supprimé avec succès',
                deleted: row
            });
        });
    });
});

// SEARCH - Rechercher des motomans
app.get('/api/motomans/search/:query', (req, res) => {
    const query = req.params.query;

    const sql = `
        SELECT * FROM motomans 
        WHERE nom LIKE ? OR prenom LIKE ? OR carte_identite LIKE ? OR numero_telephone LIKE ?
        ORDER BY id DESC
    `;

    db.all(sql, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`], (err, rows) => {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }

        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

// STATS - Statistiques
app.get('/api/stats', (req, res) => {
    const queries = {
        total: 'SELECT COUNT(*) as count FROM motomans',
        avgAge: 'SELECT AVG(age) as avg FROM motomans',
        youngest: 'SELECT MIN(age) as min FROM motomans',
        oldest: 'SELECT MAX(age) as max FROM motomans'
    };

    const stats = {};
    let completed = 0;

    Object.keys(queries).forEach(key => {
        db.get(queries[key], [], (err, row) => {
            if (!err) {
                stats[key] = Object.values(row)[0];
            }
            completed++;

            if (completed === Object.keys(queries).length) {
                res.json({
                    success: true,
                    data: stats
                });
            }
        });
    });
});

// ========================================
// DÉMARRAGE SERVEUR
// ========================================

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🏍️ SERVEUR GESTION MOTOMANS');
    console.log('='.repeat(60));
    console.log(`📍 Serveur       : http://localhost:${PORT}`);
    console.log(`🌐 Admin Panel   : http://localhost:${PORT}/admin-motomans.html`);
    console.log('='.repeat(60));
    console.log('\n📋 ENDPOINTS :');
    console.log('  POST   /api/motomans         - Créer un motoman');
    console.log('  GET    /api/motomans         - Tous les motomans');
    console.log('  GET    /api/motomans/:id     - Un motoman');
    console.log('  PUT    /api/motomans/:id     - Modifier');
    console.log('  DELETE /api/motomans/:id     - Supprimer');
    console.log('  GET    /api/motomans/search/:q - Rechercher');
    console.log('  GET    /api/stats            - Statistiques');
    console.log('='.repeat(60) + '\n');
});

// Fermer proprement
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('\n📦 Base de données fermée');
        console.log('👋 Au revoir!\n');
        process.exit(0);
    });
});
