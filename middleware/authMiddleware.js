const jwt = require('jsonwebtoken');
const SECRET = "dropx_secret_key";

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) return res.status(403).json({ message: "Token missing" });

  const realToken = token.startsWith("Bearer ") ? token.split(" ")[1] : token;

  jwt.verify(realToken, SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });

    req.user = decoded; // { id, role }
    next();
  });
};

module.exports = verifyToken;
