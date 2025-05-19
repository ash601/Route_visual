import DeckGL from "@deck.gl/react";
import { Map as MapGL } from "react-map-gl";
import maplibregl from "maplibre-gl";
import { PolygonLayer, ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "deck.gl"; // Kept for potential future use or if changeLocation is called internally
import { TripsLayer } from "@deck.gl/geo-layers";
import { createGeoJSONCircle } from "../helpers";
import { useEffect, useRef, useState } from "react";
import { getBoundingBoxFromPolygon, getMapGraph, getNearestNode } from "../services/MapService";
import PathfindingState from "../models/PathfindingState";
import Interface from "./Interface";
import { INITIAL_COLORS, INITIAL_VIEW_STATE, MAP_STYLE } from "../config";
import useSmoothStateChange from "../hooks/useSmoothStateChange";

const FIXED_RADIUS = 4;
const FIXED_SPEED = 5;
const FIXED_ALGORITHM = "dijkstra";

function Map() {
    const [startNode, setStartNode] = useState(null);
    const [endNode, setEndNode] = useState(null);
    const [selectionRadius, setSelectionRadius] = useState([]);
    const [tripsData, setTripsData] = useState([]);
    const [started, setStarted] = useState(false);
    const [time, setTime] = useState(0);
    const [animationEnded, setAnimationEnded] = useState(false);
    const [playbackOn, setPlaybackOn] = useState(false);
    const [fadeRadiusReverse, setFadeRadiusReverse] = useState(false);
    const [placeEnd, setPlaceEnd] = useState(false);
    const [loading, setLoading] = useState(false);
    // settings state now only holds fixed values, effectively making it constant after init
    const [settings, setSettings] = useState({
        algorithm: FIXED_ALGORITHM,
        radius: FIXED_RADIUS,
        speed: FIXED_SPEED
    });
    // Colors are initialized but not changeable via UI anymore
    const [colors, setColors] = useState(INITIAL_COLORS);
    const [viewState, setViewState] = useState(INITIAL_VIEW_STATE); // Defaults to Dehradun
    const ui = useRef();
    const fadeRadius = useRef();
    const requestRef = useRef();
    const previousTimeRef = useRef();
    const timer = useRef(0);
    const waypoints = useRef([]);
    const state = useRef(new PathfindingState());
    const traceNode = useRef(null);
    const selectionRadiusOpacity = useSmoothStateChange(0, 0, 1, 400, fadeRadius.current, fadeRadiusReverse);

    async function mapClick(e, info) {
        if(started && !animationEnded) return;

        setFadeRadiusReverse(false);
        fadeRadius.current = true;
        clearPath();

        if(info.rightButton || placeEnd) {
            if(e.layer?.id !== "selection-radius") {
                ui.current.showSnack("Please select a point inside the radius.", "info");
                return;
            }
            if(loading) {
                ui.current.showSnack("Please wait for all data to load.", "info");
                return;
            }
            const loadingHandle = setTimeout(() => setLoading(true), 300);
            const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
            clearTimeout(loadingHandle);
            setLoading(false);
            if(!node) {
                ui.current.showSnack("No path was found in the vicinity, please try another location.");
                return;
            }
            const realEndNode = state.current.getNode(node.id);
            setEndNode(node);
            if(!realEndNode) {
                ui.current.showSnack("An error occurred. Please try again.");
                return;
            }
            state.current.endNode = realEndNode;
            return;
        }

        const loadingHandle = setTimeout(() => setLoading(true), 300);
        const node = await getNearestNode(e.coordinate[1], e.coordinate[0]);
        clearTimeout(loadingHandle);
        setLoading(false);

        if(!node) {
            ui.current.showSnack("No path was found in the vicinity, please try another location.");
            return;
        }

        setStartNode(node);
        setEndNode(null);
        const circle = createGeoJSONCircle([node.lon, node.lat], settings.radius);
        setSelectionRadius([{ contour: circle}]);
        
        const graphLoadingHandle = setTimeout(() => setLoading(true), 300);
        getMapGraph(getBoundingBoxFromPolygon(circle), node.id).then(graph => {
            state.current.graph = graph;
            clearPath();
        }).catch(error => {
            console.error("Error fetching map graph:", error);
            ui.current.showSnack("Error fetching map data. Please try again.", "error");
        }).finally(() => {
            clearTimeout(graphLoadingHandle);
            setLoading(false);
        });
    }

    function startPathfinding() {
        if (!startNode || !endNode) {
            ui.current.showSnack("Please select a start and end node.", "info");
            return;
        }
        setFadeRadiusReverse(true);
        setTimeout(() => {
            clearPath();
            state.current.start(settings.algorithm); // Uses fixed algorithm
            setAnimationEnded(false);
            setStarted(true);
            setPlaybackOn(true);
        }, 400);
    }

    function toggleAnimation(loop = true) {
        if (!startNode || !endNode) return;

        if (animationEnded) {
            if (loop) {
                setTime(0);
                setAnimationEnded(false);
                setStarted(true);
                setPlaybackOn(true);
            }
            return;
        }
        setStarted(!started);
        setPlaybackOn(!playbackOn);

        if (!started) {
            previousTimeRef.current = null;
        }
    }

    function clearPath() {
        setStarted(false);
        setPlaybackOn(false);
        setTripsData([]);
        setTime(0);
        if (state.current.graph) {
            state.current.reset();
        }
        waypoints.current = [];
        timer.current = 0;
        previousTimeRef.current = null;
        traceNode.current = null;
        setAnimationEnded(false);
    }

    function animateStep(newTime) {
        const updatedNodes = state.current.nextStep();
        for(const updatedNode of updatedNodes) {
            updateWaypoints(updatedNode, updatedNode.referer);
        }

        if(state.current.finished && !animationEnded) {
            if(!traceNode.current) traceNode.current = state.current.endNode;
            const parentNode = traceNode.current?.parent;
            updateWaypoints(parentNode, traceNode.current, "route", Math.max(Math.log2(settings.speed), 1));
            traceNode.current = parentNode ?? traceNode.current;

            if (time >= timer.current && parentNode == null) {
                setAnimationEnded(true);
                setStarted(false);
                setPlaybackOn(false);
            }
        }

        if (previousTimeRef.current != null && !animationEnded && started) {
            const deltaTime = newTime - previousTimeRef.current;
            setTime(prevTime => (prevTime + deltaTime));
        }
    }

    function animate(newTime) {
        if (!started) return;

        for(let i = 0; i < settings.speed; i++) {
            if (animationEnded) break;
            animateStep(newTime);
        }

        previousTimeRef.current = newTime;
        if (!animationEnded) {
             requestRef.current = requestAnimationFrame(animate);
        }
    }

    function updateWaypoints(node, refererNode, color = "path", timeMultiplier = 1) {
        if(!node || !refererNode) return;
        const distance = Math.hypot(node.longitude - refererNode.longitude, node.latitude - refererNode.latitude);
        const timeAdd = distance * 50000 * timeMultiplier;

        waypoints.current = [...waypoints.current,
            {
                path: [[refererNode.longitude, refererNode.latitude], [node.longitude, node.latitude]],
                timestamps: [timer.current, timer.current + timeAdd],
                color,
            }
        ];
        timer.current += timeAdd;
        setTripsData([...waypoints.current]);
    }


    useEffect(() => {
        if (started && !animationEnded) {
            requestRef.current = requestAnimationFrame(animate);
        } else if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [started, animationEnded]);

    useEffect(() => {
        // Geolocation call removed to ensure Dehradun is always the initial view.
        // localStorage loading logic removed as settings are fixed and colors are not changeable via UI.
        // If you later add a way to change colors that persists, you'd re-add localStorage for colors.
    }, []);

    return (
        <>
            <div onContextMenu={(e) => { e.preventDefault(); }}>
                <DeckGL
                    initialViewState={viewState} // Uses INITIAL_VIEW_STATE (Dehradun)
                    controller={{ doubleClickZoom: false, keyboard: false }}
                    onClick={mapClick}
                >
                    <PolygonLayer
                        id={"selection-radius"}
                        data={selectionRadius}
                        pickable={true}
                        stroked={true}
                        getPolygon={d => d.contour}
                        getFillColor={[80, 210, 0, 10]}
                        getLineColor={[9, 142, 46, 175]}
                        getLineWidth={3}
                        opacity={selectionRadiusOpacity}
                    />
                    <TripsLayer
                        id={"pathfinding-layer"}
                        data={tripsData}
                        opacity={1}
                        widthMinPixels={3}
                        widthMaxPixels={5}
                        fadeTrail={false}
                        currentTime={time}
                        getColor={d => colors[d.color]} // Uses INITIAL_COLORS
                        updateTriggers={{
                            getColor: [colors.path, colors.route]
                        }}
                    />
                    <ScatterplotLayer
                        id="start-end-points"
                        data={[
                            ...(startNode ? [{ coordinates: [startNode.lon, startNode.lat], color: colors.startNodeFill, lineColor: colors.startNodeBorder }] : []),
                            ...(endNode ? [{ coordinates: [endNode.lon, endNode.lat], color: colors.endNodeFill, lineColor: colors.endNodeBorder }] : []),
                        ]}
                        pickable={true}
                        opacity={1}
                        stroked={true}
                        filled={true}
                        radiusScale={1}
                        radiusMinPixels={7}
                        radiusMaxPixels={20}
                        lineWidthMinPixels={1}
                        lineWidthMaxPixels={3}
                        getPosition={d => d.coordinates}
                        getFillColor={d => d.color}
                        getLineColor={d => d.lineColor}
                    />
                    <MapGL
                        reuseMaps mapLib={maplibregl}
                        mapStyle={MAP_STYLE}
                        doubleClickZoom={false}
                    />
                </DeckGL>
            </div>
            <Interface
                ref={ui}
                canStart={startNode && endNode}
                started={started}
                animationEnded={animationEnded}
                playbackOn={playbackOn}
                loading={loading}
                placeEnd={placeEnd}
                setPlaceEnd={setPlaceEnd}
                startPathfinding={startPathfinding}
                toggleAnimation={toggleAnimation}
            />
            <div className="attrib-container"><summary className="maplibregl-ctrl-attrib-button" title="Toggle attribution" aria-label="Toggle attribution"></summary><div className="maplibregl-ctrl-attrib-inner">© <a href="https://carto.com/about-carto/" target="_blank" rel="noopener">CARTO</a>, © <a href="http://www.openstreetmap.org/about/" target="_blank">OpenStreetMap</a> contributors</div></div>
        </>
    );
}

export default Map;