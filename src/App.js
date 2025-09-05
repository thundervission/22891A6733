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

const LOG_API = "http://20.244.56.144/evaluation-service/logs";
const ACCESS_TOKEN = "YzuJeU";

const logEvent = async (stack, level, packageType, message) => {
  try {
    await fetch(LOG_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ stack, level, package: packageType, message }),
    });
    console.log("✅ Log:", level, message);
  } catch (err) {
    console.error("❌ Log failed:", err);
  }
};

const shortenerLogEvent = (level, message) => {
  logEvent("frontend", level, "component", message);
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidShortcode = (code) => /^[a-zA-Z0-9]{3,10}$/.test(code);

const CustomAlert = ({ open, message, onClose }) => (
  <Modal open={open} onClose={onClose}>
    <Fade in={open}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          border: "2px solid #000",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          Application Alert
        </Typography>
        <Typography sx={{ mt: 2 }}>{message}</Typography>
        <Button onClick={onClose} sx={{ mt: 2 }} variant="contained">
          OK
        </Button>
      </Box>
    </Fade>
  </Modal>
);

function App() {
  const [urls, setUrls] = useState([]);
  const [url, setUrl] = useState("");
  const [validity, setValidity] = useState(30);
  const [shortcode, setShortcode] = useState("");
  const [currentTab, setCurrentTab] = useState(0);
  const [alert, setAlert] = useState({ open: false, message: "" });

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.hash.slice(2);
      if (path && path !== "stats") {
        const entry = urls.find((u) => u.shortCode === path);
        if (entry && new Date(entry.expiry) > new Date()) {
          const updatedUrls = urls.map((item) =>
            item.shortCode === path
              ? {
                  ...item,
                  clicks: [
                    ...item.clicks,
                    {
                      timestamp: new Date().toISOString(),
                      source: "Web",
                      location: "India",
                    },
                  ],
                }
              : item
          );
          setUrls(updatedUrls);
          window.location.replace(entry.originalUrl);
          shortenerLogEvent("info", `Redirected ${path} → ${entry.originalUrl}`);
        } else {
          setAlert({ open: true, message: "Link not found or expired." });
          shortenerLogEvent("error", `Redirect failed for ${path}`);
          window.location.hash = "";
        }
      }
    };
    window.addEventListener("hashchange", handleUrlChange);
    handleUrlChange();
    return () => window.removeEventListener("hashchange", handleUrlChange);
  }, [urls]);

  const handleShorten = () => {
    shortenerLogEvent("debug", "Shorten URL clicked.");
    if (!isValidUrl(url)) {
      setAlert({ open: true, message: "Please enter a valid URL." });
      shortenerLogEvent("error", "Invalid URL entered.");
      return;
    }
    if (shortcode && !isValidShortcode(shortcode)) {
      setAlert({ open: true, message: "Invalid shortcode. 3-10 alphanumeric only." });
      shortenerLogEvent("error", "Invalid shortcode entered.");
      return;
    }
    if (urls.length >= 5) {
      setAlert({ open: true, message: "Only 5 URLs allowed." });
      shortenerLogEvent("warn", "URL limit exceeded.");
      return;
    }
    const codeInUse = urls.some((item) => item.shortCode === shortcode);
    if (shortcode && codeInUse) {
      setAlert({ open: true, message: `Shortcode "${shortcode}" already in use.` });
      shortenerLogEvent("error", `Collision for shortcode: ${shortcode}`);
      return;
    }
    const newCode = shortcode || Math.random().toString(36).substring(2, 8);
    const expiryDate = new Date(Date.now() + (validity || 30) * 60000);
    const newUrlEntry = {
      originalUrl: url,
      shortCode: newCode,
      expiry: expiryDate.toISOString(),
      clicks: [],
    };
    setUrls((prev) => [...prev, newUrlEntry]);
    shortenerLogEvent("info", `Shortened ${url} → ${newCode}`);
    setShortcode("");
    setUrl("");
    setValidity(30);
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    window.location.hash = newValue === 0 ? "" : "stats";
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            URL Shortener
          </Typography>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            textColor="inherit"
            indicatorColor="secondary"
          >
            <Tab label="Shortener" />
            <Tab label="Statistics" />
          </Tabs>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {currentTab === 0 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                Shorten a URL
              </Typography>
              <TextField
                label="Long URL"
                fullWidth
                margin="normal"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <TextField
                label="Validity (minutes)"
                type="number"
                fullWidth
                margin="normal"
                value={validity}
                onChange={(e) => setValidity(e.target.value)}
              />
              <TextField
                label="Custom Shortcode (3-10 chars)"
                fullWidth
                margin="normal"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleShorten}
                sx={{ mt: 2 }}
                disabled={!url}
              >
                Shorten
              </Button>
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6">Your Shortened URLs ({urls.length}/5)</Typography>
                <List>
                  {urls.map((entry, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={
                          <a
                            href={`#/${entry.shortCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {`http://localhost:3000/#/${entry.shortCode}`}
                          </a>
                        }
                        secondary={`Original: ${entry.originalUrl} | Expires: ${new Date(
                          entry.expiry
                        ).toLocaleString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          )}
          {currentTab === 1 && (
            <Box>
              <Typography variant="h5" gutterBottom>
                URL Statistics
              </Typography>
              {urls.length > 0 ? (
                <List>
                  {urls.map((entry, index) => (
                    <Card key={index} sx={{ mb: 2 }}>
                      <CardContent>
                        <Typography variant="h6">Shortcode: {entry.shortCode}</Typography>
                        <Typography>Original URL: {entry.originalUrl}</Typography>
                        <Typography>Clicks: {entry.clicks.length}</Typography>
                        <Typography>
                          Expires: {new Date(entry.expiry).toLocaleString()}
                        </Typography>
                        {entry.clicks.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle1">Click Details:</Typography>
                            <List dense>
                              {entry.clicks.map((click, cIndex) => (
                                <ListItem key={cIndex}>
                                  <ListItemText
                                    primary={`Time: ${new Date(click.timestamp).toLocaleString()}`}
                                    secondary={`Source: ${click.source} | Location: ${click.location}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </List>
              ) : (
                <Typography>No URLs shortened yet.</Typography>
              )}
            </Box>
          )}
        </Paper>
      </Container>
      <CustomAlert
        open={alert.open}
        message={alert.message}
        onClose={() => setAlert({ open: false, message: "" })}
      />
    </Box>
  );
}

export default App;

