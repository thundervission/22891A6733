import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Paper,
  Tabs,
  Tab,
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Modal,
  Fade
} from "@mui/material";
import "./App.css";

// ✅ Logging Middleware (must be first thing in project)
const LOG_API = "http://20.244.56.144/evaluation-service/logs";
const ACCESS_TOKEN = "PUT-YOUR-TOKEN-HERE"; // 👉 replace with exam token

const logEvent = async (stack, level, packageType, message) => {
  try {
    const response = await fetch(LOG_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ stack, level, package: packageType, message }),
    });
    console.log("✅ Log sent:", level, message);
    return await response.json();
  } catch (err) {
    console.error("❌ Log failed:", err);
  }
};

const shortenerLogEvent = (level, message) => {
  logEvent("frontend", level, "component", message);
};

// 👉 Validation helpers
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
const isValidShortcode = (code) => /^[a-zA-Z0-9]{3,10}$/.test(code);

// 👉 Simple Modal for Alerts
const CustomAlert = ({ open, message, onClose }) => (
  <Modal open={open} onClose={onClose}>
    <Fade in={open}>
      <Box sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 400,
        bgcolor: "background.paper",
        p: 4,
        borderRadius: 2,
        boxShadow: 24
      }}>
        <Typography variant="h6">Alert</Typography>
        <Typography sx={{ mt: 2 }}>{message}</Typography>
        <Button sx={{ mt: 2 }} variant="contained" onClick={onClose}>OK</Button>
      </Box>
    </Fade>
  </Modal>
);

function App() {
  const [urls, setUrls] = useState([]);
  const [url, setUrl] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [validity, setValidity] = useState(30);
  const [tab, setTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: "" });

  // 👉 Redirect if shortcode is in URL
  useEffect(() => {
    const handleHashChange = () => {
      const code = window.location.hash.slice(2);
      if (!code || code === "stats") return;

      const entry = urls.find(u => u.shortCode === code);
      if (entry && new Date(entry.expiry) > new Date()) {
        const updated = urls.map(u =>
          u.shortCode === code
            ? { ...u, clicks: [...u.clicks, { time: new Date().toISOString() }] }
            : u
        );
        setUrls(updated);
        shortenerLogEvent("info", `Redirected ${code} → ${entry.originalUrl}`);
        window.location.replace(entry.originalUrl);
      } else {
        setAlert({ open: true, message: "Invalid or expired link." });
        shortenerLogEvent("error", `Redirect failed for ${code}`);
        window.location.hash = "";
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [urls]);

  // 👉 Handle Shortening
  const handleShorten = () => {
    if (!isValidUrl(url)) {
      setAlert({ open: true, message: "Enter a valid URL" });
      shortenerLogEvent("error", "Invalid URL input");
      return;
    }
    if (shortcode && !isValidShortcode(shortcode)) {
      setAlert({ open: true, message: "Shortcode must be 3-10 letters/numbers" });
      shortenerLogEvent("error", "Invalid shortcode input");
      return;
    }
    if (urls.length >= 5) {
      setAlert({ open: true, message: "Max 5 URLs allowed" });
      shortenerLogEvent("warn", "Max URL limit reached");
      return;
    }
    if (urls.some(u => u.shortCode === shortcode)) {
      setAlert({ open: true, message: "Shortcode already in use" });
      shortenerLogEvent("error", "Shortcode collision");
      return;
    }

    const code = shortcode || Math.random().toString(36).substring(2, 7);
    const expiry = new Date(Date.now() + validity * 60000).toISOString();
    const entry = { originalUrl: url, shortCode: code, expiry, clicks: [] };
    setUrls([...urls, entry]);

    setUrl(""); setShortcode(""); setValidity(30);
    shortenerLogEvent("info", `Shortened ${url} → ${code}`);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography sx={{ flexGrow: 1 }}>URL Shortener</Typography>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); window.location.hash = v ? "stats" : ""; }}>
            <Tab label="Shortener" />
            <Tab label="Statistics" />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          {tab === 0 && (
            <Box>
              <TextField
                label="Long URL"
                fullWidth margin="normal"
                value={url} onChange={e => setUrl(e.target.value)}
              />
              <TextField
                label="Custom Shortcode (3-10 chars)"
                fullWidth margin="normal"
                value={shortcode} onChange={e => setShortcode(e.target.value)}
              />
              <TextField
                label="Validity (minutes)"
                type="number"
                fullWidth margin="normal"
                value={validity} onChange={e => setValidity(Number(e.target.value))}
              />
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleShorten}>Shorten</Button>
              <List sx={{ mt: 3 }}>
                {urls.map((u, i) => (
                  <ListItem key={i}>
                    <ListItemText
                      primary={<a href={`#/${u.shortCode}`}>{`http://localhost:3000/#/${u.shortCode}`}</a>}
                      secondary={`Original: ${u.originalUrl} | Expires: ${new Date(u.expiry).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {tab === 1 && (
            <Box>
              {urls.map((u, i) => (
                <Card key={i} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography>Shortcode: {u.shortCode}</Typography>
                    <Typography>URL: {u.originalUrl}</Typography>
                    <Typography>Clicks: {u.clicks.length}</Typography>
                    <Typography>Expiry: {new Date(u.expiry).toLocaleString()}</Typography>
                  </CardContent>
                </Card>
              ))}
              {urls.length === 0 && <Typography>No data yet.</Typography>}
            </Box>
          )}
        </Paper>
      </Container>

      <CustomAlert open={alert.open} message={alert.message} onClose={() => setAlert({ open: false, message: "" })} />
    </Box>
  );
}

export default App;

