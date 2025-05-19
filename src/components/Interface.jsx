import { Button, IconButton, Typography, Snackbar, Alert, CircularProgress, Fade } from "@mui/material"; // Tooltip, Drawer, MenuItem, Select, InputLabel, FormControl, Menu, Settings icon removed
import { PlayArrow, Pause } from "@mui/icons-material";
import { useState, useRef, useImperativeHandle, forwardRef } from "react";


const Interface = forwardRef(({ canStart, started, animationEnded, playbackOn,
                                loading, placeEnd,
                                setPlaceEnd,
                                startPathfinding, toggleAnimation }, ref) => { // settings, changeAlgorithm, setSettings, changeLocation, colors, setColors props removed
    const [snack, setSnack] = useState({
        open: false,
        message: "",
        type: "error",
    });

    useImperativeHandle(ref, () => ({
        showSnack(message, type = "error") {
            setSnack({ open: true, message, type });
        },
    }));

    function closeSnack() {
        setSnack({...snack, open: false});
    }

    function handlePlay() {
        if(!canStart) return;
        if(!started && !animationEnded) {
            startPathfinding();
            return;
        }
        toggleAnimation();
    }


    window.onkeyup = e => {
        if(e.code === "Space") {
            e.preventDefault();
            handlePlay();
        }
    };

    return (
        <>
            <div className={`nav-top`}>
                <IconButton disabled={!canStart} onClick={handlePlay} style={{ backgroundColor: "#46B780", width: 60, height: 60 }} size="large">
                    {(!started || (animationEnded && !playbackOn))
                        ? <PlayArrow style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                        : <Pause style={{ color: "#fff", width: 26, height: 26 }} fontSize="inherit" />
                    }
                </IconButton>
            </div>

            {/* nav-right div containing settings button removed */}

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

            <div className="mobile-controls">
                <Button onClick={() => {setPlaceEnd(!placeEnd);}} style={{ color: "#fff", backgroundColor: "#404156", paddingInline: 30, paddingBlock: 7 }} variant="contained">
                    {placeEnd ? "placing end node" : "placing start node"}
                </Button>
            </div>

            {/* Drawer component removed */}
        </>
    );
});

Interface.displayName = "Interface";

export default Interface;