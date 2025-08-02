const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

// === Middleware ===
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// === Test Endpoint ===
app.get('/', (req, res) => {
  res.send('drop.x backend is running...');
});

// === Auth Routes ===
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// === Functional Modules ===
app.use('/api/lots', require('./routes/lots'));
app.use('/api/production', require('./routes/production'));
app.use('/api/salary', require('./routes/salary'));
app.use('/api/incharge', require('./routes/incharge'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/invoice', require('./routes/invoice'));
app.use('/api/quotation', require('./routes/quotation'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/users', require('./routes/users'));
app.use('/api/alter', require('./routes/alter'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// === Server Start ===
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
