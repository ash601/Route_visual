// src/components/Interface.jsx
// Add TextField to imports from @mui/material
import { Button, IconButton, Typography, Snackbar, Alert, CircularProgress, Fade, Tooltip, Drawer, MenuItem, Select, InputLabel, FormControl, Menu, TextField } from "@mui/material";
import { PlayArrow, Settings, Movie, Pause, Search as SearchIcon } from "@mui/icons-material"; // Added SearchIcon
import Slider from "./Slider";
import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { LOCATIONS } from "../config";

// Add onSearchByPlaceNames to the destructured props
const Interface = forwardRef(({ canStart, started, animationEnded, pathRealDistance, playbackOn, time, maxTime, settings, loading, timeChanged, cinematic, placeEnd, changeRadius, changeAlgorithm, setPlaceEnd, setCinematic, setSettings, startPathfinding, toggleAnimation, clearPath, changeLocation, onSearchByPlaceNames }, ref) => {
    const [sidebar, setSidebar] = useState(false);
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        type: "error",
    });
    const [helper, setHelper] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState(null);
    const menuOpen = Boolean(menuAnchor);
    const helperTime = useRef(4800);
    const rightDown = useRef(false);
    const leftDown = useRef(false);

    // State for the input fields
    const [startPlace, setStartPlace] = useState("");
    const [endPlace, setEndPlace] = useState("");

    useImperativeHandle(ref, () => ({
        showSnack(message, type = "error") {
            setSnack({ open: true, message, type });
        },
    }));
      
    function closeSnack() {
        setSnack({...snack, open: false});
    }

    function closeHelper() {
        setHelper(false);
    }

    function handlePlay() {
        if(!canStart) return;
        if(!started && time === 0) {
            startPathfinding();
            return;
        }
        toggleAnimation();
    }
    
    function closeMenu() {
        setMenuAnchor(null);
    }

    const handlePlaceSearch = () => {
        if (startPlace && endPlace) {
            onSearchByPlaceNames(startPlace, endPlace);
        } else {
            setSnack({ open: true, message: "Please enter both start and end place names.", type: "info" });
        }
    };

    window.onkeydown = e => {
        if(e.code === "ArrowRight" && !rightDown.current && !leftDown.current && (!started || animationEnded)) {
            rightDown.current = true;
            toggleAnimation(false, 1);
        }
        else if(e.code === "ArrowLeft" && !leftDown.current && !rightDown.current && animationEnded) {
            leftDown.current = true;
            toggleAnimation(false, -1);
        }
    };

    window.onkeyup = e => {
        if(e.code === "Escape") setCinematic(false);
        else if(e.code === "Space") {
            e.preventDefault();
            handlePlay();
        }
        else if(e.code === "ArrowRight" && rightDown.current) {
            rightDown.current = false;
            toggleAnimation(false, 1);
        }
        else if(e.code === "ArrowLeft" && animationEnded && leftDown.current) {
            leftDown.current = false;
            toggleAnimation(false, 1);
        }
        else if(e.code === "KeyR" && (animationEnded || !started)) clearPath();
    };

    useEffect(() => {
        if(!cinematic) return;
        setHelper(true);
        setTimeout(() => {
            helperTime.current = 2500;
        }, 200);
    }, [cinematic]);

    return (
        <>
            <div className={`nav-top ${cinematic ? "cinematic" : ""}`}>
                <div className="side slider-container">
                    <Typography id="playback-slider" gutterBottom>
                        Animation playback
                    </Typography>
                    <Slider disabled={!animationEnded}  value={animationEnded ? time : maxTime} min={animationEnded ? 0 : -1} max={maxTime} onChange={(e) => {timeChanged(Number(e.target.value));}} className="slider" aria-labelledby="playback-slider" />
                     {animationEnded && pathRealDistance !== null && (
                        <Typography variant="body2" style={{ textAlign: 'center', marginTop: '5px', color: '#C5C5C5' }}>
                            Path Distance: {pathRealDistance.toFixed(2)} km 
                            ({(pathRealDistance * 0.621371).toFixed(2)} miles)
                        </Typography>
                    )}
                </div>
                <IconButton disabled={!canStart} onClick={handlePlay} style={{ backgroundColor: "#46B780", width: 60, height: 60 }} size="large">
                    {(!started || animationEnded && !playbackOn) 
                        ? <PlayArrow style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                        : <Pause style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                    }
                </IconButton>
                <div className="side">
                    <Button disabled={!animationEnded && started} onClick={clearPath} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">Clear path</Button>
                </div>
            </div>

            {/* ... (rest of the existing UI like nav-right, loader, snackbars) ... */}
            <div className={`nav-right ${cinematic ? "cinematic" : ""}`}>
                <Tooltip title="Open settings">
                    <IconButton onClick={() => {setSidebar(true);}} style={{ backgroundColor: "#2A2B37", width: 36, height: 36 }} size="large">
                        <Settings style={{ color: "#fff", width: 24, height: 24 }} fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Cinematic mode">
                    <IconButton className="btn-cinematic" onClick={() => {setCinematic(!cinematic);}} style={{ backgroundColor: "#2A2B37", width: 36, height: 36 }} size="large">
                        <Movie style={{ color: "#fff", width: 24, height: 24 }} fontSize="inherit" />
                    </IconButton>
                </Tooltip>
            </div>

            <div className="loader-container">
                <Fade
                    in={loading}
                    style={{
                        transitionDelay: loading ? "50ms" : "0ms",
                    }}
                    unmountOnExit
                >
                    <CircularProgress color="inherit" />
                </Fade>
            </div>

            <Snackbar 
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }} 
                open={snack.open} 
                autoHideDuration={4000} 
                onClose={closeSnack}>
                <Alert 
                    onClose={closeSnack} 
                    severity={snack.type} 
                    style={{ width: "100%", color: "#fff" }}
                >
                    {snack.message}
                </Alert>
            </Snackbar>

            <Snackbar 
                anchorOrigin={{ vertical: "top", horizontal: "center" }} 
                open={helper} 
                autoHideDuration={helperTime.current} 
                onClose={closeHelper}
            >
                <div className="cinematic-alert">
                    <Typography fontSize="18px"><b>Cinematic mode</b></Typography>
                    <Typography>Use keyboard shortcuts to control animation</Typography>
                    <Typography>Press <b>Escape</b> to exit</Typography>
                </div>
            </Snackbar>

            <div className="mobile-controls">
                <Button onClick={() => {setPlaceEnd(!placeEnd);}} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">
                    {placeEnd ? "placing end node" : "placing start node"}
                </Button>
            </div>


            <Drawer
                className={`side-drawer ${cinematic ? "cinematic" : ""}`}
                anchor="left"
                open={sidebar}
                onClose={() => {setSidebar(false);}}
            >
                <div className="sidebar-container">
                    {/* New Input Fields and Button */}
                    <Typography variant="h6" gutterBottom style={{marginTop: '10px'}}>Search Places in Dehradun</Typography>
                    <TextField
                        label="Start Place"
                        variant="filled"
                        value={startPlace}
                        onChange={(e) => setStartPlace(e.target.value)}
                        fullWidth
                        style={{ marginBottom: '10px', backgroundColor: '#404156'}}
                        InputLabelProps={{style: {color: '#A8AFB3'}}}
                        InputProps={{style: {color: '#fff'}}}
                    />
                    <TextField
                        label="End Place"
                        variant="filled"
                        value={endPlace}
                        onChange={(e) => setEndPlace(e.target.value)}
                        fullWidth
                        style={{ marginBottom: '15px', backgroundColor: '#404156'}}
                        InputLabelProps={{style: {color: '#A8AFB3'}}}
                        InputProps={{style: {color: '#fff'}}}
                    />
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handlePlaceSearch}
                        disabled={loading || (started && !animationEnded)}
                        fullWidth
                        style={{ marginBottom: '20px', backgroundColor: '#46B780', color: '#fff' }}
                        startIcon={<SearchIcon />}
                    >
                        Find Path by Names
                    </Button>

                    <FormControl variant="filled" style={{width: '100%', marginBottom: '20px'}}>
                        <InputLabel style={{ fontSize: 14, color: '#A8AFB3' }} id="algo-select">Algorithm</InputLabel>
                        <Select
                            labelId="algo-select"
                            value={settings.algorithm}
                            onChange={e => {changeAlgorithm(e.target.value);}}
                            required
                            style={{ backgroundColor: "#404156", color: "#fff", width: "100%"}}
                            inputProps={{MenuProps: {MenuListProps: {sx: {backgroundColor: "#404156"}}}}}
                            size="small"
                            disabled={!animationEnded && started}
                        >
                            <MenuItem value={"astar"}>A* algorithm</MenuItem>
                            <MenuItem value={"dijkstra"}>Dijkstra&apos;s algorithm</MenuItem>
                        </Select>
                    </FormControl>

                    <div style={{marginBottom: '20px'}}>
                        <Button
                            id="locations-button"
                            aria-controls={menuOpen ? "locations-menu" : undefined}
                            aria-haspopup="true"
                            aria-expanded={menuOpen ? "true" : undefined}
                            onClick={(e) => {setMenuAnchor(e.currentTarget);}}
                            variant="contained"
                            disableElevation
                            fullWidth
                            style={{ backgroundColor: "#404156", color: "#fff", textTransform: "none", fontSize: 16, justifyContent: "start", paddingBlock: 8 }}
                        >
                            Preset Locations
                        </Button>
                        <Menu
                            id="locations-menu"
                            anchorEl={menuAnchor}
                            open={menuOpen}
                            onClose={() => {setMenuAnchor(null);}}
                            MenuListProps={{
                                "aria-labelledby": "locations-button",
                                sx: {
                                    backgroundColor: "#404156",
                                    width: menuAnchor ? menuAnchor.clientWidth : undefined // Make menu same width as button
                                }
                            }}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "left",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "left",
                            }}
                        >
                            {LOCATIONS.map(location => 
                                <MenuItem key={location.name} onClick={() => {
                                    closeMenu();
                                    changeLocation(location);
                                }}>{location.name}</MenuItem>
                            )}
                        </Menu>
                    </div>

                    <div className="side slider-container" style={{marginBottom: '10px'}}>
                        <Typography id="area-slider" >
                            Area radius: {settings.radius}km ({(settings.radius / 1.609).toFixed(1)}mi)
                        </Typography>
                        <Slider disabled={(started && !animationEnded)} min={2} max={20} step={1} value={settings.radius} onChangeCommitted={(event, value) => { changeRadius(value); }} onChange={(e, newValue) => { setSettings(prev => ({...prev, radius: Number(newValue)})); }} className="slider" aria-labelledby="area-slider" style={{ marginBottom: 1 }} 
                            marks={[
                                { value: 2, label: "2km" },
                                { value: 20, label: "20km" }
                            ]} 
                        />
                    </div>

                    <div className="side slider-container">
                        <Typography id="speed-slider" >
                            Animation speed
                        </Typography>
                        <Slider min={1} max={30} value={settings.speed} onChange={(e, newValue) => { setSettings(prev => ({...prev, speed: Number(newValue)})); }} className="slider" aria-labelledby="speed-slider" style={{ marginBottom: 1 }} />
                    </div>
                </div>
            </Drawer>

            <a href="https://github.com/honzaap/Pathfinding" aria-label="GitHub repository" target="_blank" rel="noopener noreferrer" className={`github-corner ${cinematic ? "cinematic" : ""}`}>
                <svg width="60" height="60" viewBox="0 0 250 250">
                    <path fill="#2A2B37" d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z"></path><path d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2" fill="currentColor" className="octo-arm"></path><path d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.9,65.4 C194.5,69.0 197.7,73.2 200.1,77.6 C213.8,80.2 216.3,84.9 216.3,84.9 C212.7,93.1 206.9,96.0 205.4,96.6 C205.1,102.4 203.0,107.8 198.3,112.5 C181.9,128.9 168.3,122.5 157.7,114.1 C157.9,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z" fill="currentColor" className="octo-body"></path>
                </svg>
            </a>
        </>
    );
});

Interface.displayName = "Interface";

export default Interface;