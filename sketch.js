let faceapi;
let detections = [];
let video;
let showVideo; // = true;
let canvas;
let arrow;
let modeButtons = [];
let graphics;
let pointsColor = 0;
let mode; //= "type";
let pressed = false;
let downarrow = document.getElementById("downarrow");
let cParent = document.getElementById("canvas-parent");
let myText = document.getElementById("variable-text");
let variableText;
let cWidth;
let cHeight;
let r, g, b;
let xMultiplier = 1;
let yMultiplier = 1;
let videoReady = false;

let expressions = [
  { name: "neutral", color: "#c8c8c8", polygon: 8 },
  { name: "happy", color: "#FFFF33", polygon: 30 },
  { name: "angry", color: "#FF0000", polygon: 5 },
  { name: "sad", color: "#1F51FF", polygon: 3 },
  { name: "disgusted", color: "#00FF7F", polygon: 4 },
  { name: "surprised", color: "#FF1493", polygon: 7 },
  { name: "fearful", color: "#8A2BE2", polygon: 6 },
];

//eyes
let pupils = document.querySelectorAll(".eye .pupil");
window.addEventListener("mousemove", (e) => {
  pupils.forEach((pupil) => {
    // get x and y postion of cursor
    let rect = pupil.getBoundingClientRect();
    let x = (e.pageX - rect.left) / 100 + "px";
    let y = (e.pageY - rect.top) / 100 + "px";
    pupil.style.transform = "translate3d(" + x + "," + y + ", 0px)";
  });
});

function updateMode(newMode) {
  mode = newMode;

  let sketch = select("#Sketch");
  let type = select("#Type");
  let save = select("#Save");

  modeButtons = [sketch, type];

  modeButtons.forEach((button) => button.removeClass("active"));
  switch (mode) {
    case "sketch":
      sketch.addClass("active");
      break;
    case "type":
      type.addClass("active");
      break;
  }
}

function setup() {
  cWidth = cParent.offsetWidth;
  cHeight = cParent.offsetHeight;

  for (const e of expressions) {
    e.container = select("#" + e.name);
    e.valueEl = select(".text", e.container);
    e.barFillEl = select(".bar-fill", e.container);
    e.barFillEl.elt.style.backgroundColor = e.color;
  }

  canvas = createCanvas(cWidth, cHeight);
  canvas.id("canvas");
  canvas.parent("canvas-parent");

  graphics = createGraphics(cWidth, cHeight);

  video = createCapture(VIDEO, (stream) => {
    videoReady = true;
    windowResized();
  });
  video.hide();
  video.id("video");

  //buttons
  updateMode(mode);
  select("#Sketch").mousePressed(() =>
    updateMode(mode === "sketch" ? undefined : "sketch")
  );
  select("#Type").mousePressed(() =>
    updateMode(mode === "type" ? undefined : "type")
  );

  save = select("#Save");
  reset = select("#Reset");
  camera = select("#Camera");

  save.mousePressed(saveOn);
  reset.mousePressed(resetOn);
  camera.mousePressed(cameraOn);

  let faceOptions = {
    withLandmarks: true,
    withExpressions: true,
    withDescriptors: true,
    minConfidence: 0.5,
  };

  faceapi = ml5.faceApi(video, faceOptions, faceReady);
  // colorMode(HSB);
}

function cameraOn() {
  showVideo = !showVideo;
  pressed = !pressed;

  if (showVideo) {
    select("#Camera").addClass("active");
  } else {
    select("#Camera").removeClass("active");
  }
}

function drawVideo() {
  if (!videoReady) return;
  push();
  translate(width, 0);
  scale(-1, 1);

  if (showVideo) {
    tint(255, 30);
    image(video, 0, 0, windowWidth, windowHeight);
  }

  pop();
}

function draw() {
  clear();
  drawVideo();

  drawExpressions(detections);
  variableText = select("#variable-text");

  if (mode === "sketch") {
    drawSketch();
    variableText.style("display", "none");
  } else if (mode === "type") {
    drawType();
    variableText.style("display", "block");
  } else {
    push();
    translate(width, 0);
    scale(-1, 1);
    variableText.style("display", "none");
    drawLandmarks(detections);

    pop();
  }
}

function faceReady() {
  faceapi.detect(gotFaces); // Start detecting faces:
}

// Got faces:
function gotFaces(error, result) {
  if (error) {
    // console.log(error);
    return;
  }

  detections = result;

  faceapi.detect(gotFaces);
}

function drawSketch() {
  push();
  translate(width, 0);
  scale(-1, 1);

  if (detections.length > 0) {
    let {
      neutral,
      happy,
      angry,
      sad,
      disgusted,
      surprised,
      fearful,
    } = detections[0].expressions;

    for (const d of detections) {
      const orderOfDominance = expressions
        .map((e) => [d.expressions[e.name], e])
        .sort((a, b) => b[0] - a[0])
        .map((e) => e[1]);

      let leftEye = d.parts.leftEye;
      let rightEye = d.parts.rightEye;
      let nose = d.parts.nose;
      let eyeDist =
        dist(rightEye[0].x, rightEye[0].y, leftEye[0].x, leftEye[0].y) * 3;
      // graphics.setAlpha(1);
      graphics.blendMode(LIGHTEST);
      graphics.fill(orderOfDominance[0].color);
      graphics.noStroke();
      graphics.circle(
        nose[3].x * xMultiplier,
        nose[3].y * yMultiplier,
        eyeDist
      );
    }
    image(graphics, 0, 0);
  }
  pop();
}

function drawType() {
  if (detections.length > 0) {
    const orderOfDominance = expressions
      .map((e) => [detections[0].expressions[e.name], e])
      .sort((a, b) => b[0] - a[0])
      .map((e) => e[1]);

    variableText = select("#variable-text");
    let textwidth = map(detections[0].expressions.sad, 0, 1, 62, 125);
    variableText.style("font-variation-settings", "'wdth' " + textwidth);

    let textweight = map(detections[0].expressions.angry, 0, 1, 100, 900);
    variableText.style("font-weight", textweight);

    let textsize = map(detections[0].expressions.surprised, 0, 1, 100, 900);
    variableText.style("font-size", textsize + "px");

    let root = document.querySelector(":root");
    root.style.setProperty("--text-color", orderOfDominance[0].color);
  }
}

function drawLandmarks(detections) {
  push();
  blendMode(MULTIPLY);

  for (const detection of detections) {
    let nose = detection.parts.nose;
    let leftEye = detection.parts.leftEye;
    let rightEye = detection.parts.rightEye;
    let d = dist(leftEye[0].x, leftEye[0].y, rightEye[0].x, rightEye[0].y);

    const orderOfDominance = expressions
      .map((e) => [detection.expressions[e.name], e])
      .sort((a, b) => b[0] - a[0])
      .map((e) => e[1]);

    // Face colors
    let faceColor = orderOfDominance[0].color;
    let eyeColor = orderOfDominance[1].color;
    let noseColor = orderOfDominance[orderOfDominance.length - 1].color;

    let facePolygon = orderOfDominance[0].polygon;

    noStroke();
    fill(faceColor);

    polygon(
      nose[3].x * xMultiplier,
      nose[4].y * yMultiplier,
      d * 5,
      facePolygon
    );

    fill(noseColor);
    ellipse(nose[3].x * xMultiplier, nose[4].y * yMultiplier, d, d);

    //eyes
    strokeWeight(15 + d);
    stroke(eyeColor);
    noFill();
    ellipse(
      leftEye[0].x * xMultiplier,
      leftEye[0].y * yMultiplier,
      d * 2,
      d * 2
    );
    ellipse(
      rightEye[2].x * xMultiplier,
      rightEye[2].y * yMultiplier,
      d * 2,
      d * 2
    );
  }
  pop();
}

function polygon(x, y, radius, currentPoints) {
  let angle = TWO_PI / currentPoints;
  noStroke();
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius;
    let sy = y + sin(a) * radius;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

function drawExpressions(detections, x, y, textYSpace) {
  push();

  if (detections.length > 0) {
    for (const e of expressions) {
      if (!e.valueEl || !e.barFillEl) return;
      e.valueEl.elt.innerText =
        nf(detections[0].expressions[e.name] * 100, 2, 2) + "%";
      e.barFillEl.elt.style.width =
        Math.round((detections[0].expressions[e.name] ?? 0) * 100) + "%";
    }
  } else {
   textAlign(CENTER);
    textFont("Archivo");
    textSize(30);
    text("Loading...", cWidth/2, cHeight/2);
    
  }
  pop();
}

function saveOn() {
  saveCanvas();
}

function resetOn() {
  mode = undefined;
  graphics.clear();
}

function windowResized() {
  cWidth = cParent.offsetWidth;
  cHeight = cParent.offsetHeight;
  vWidth = video.width;
  vHeight = video.height;
  resizeCanvas(cWidth, cHeight);

  let videoRatio = video.width / video.height;
  let canvasRatio = cWidth / cHeight;

  xMultiplier = 1;
  yMultiplier = 1;

  if (videoRatio > canvasRatio) {
    // video is wider than canvas
    xMultiplier = cWidth / vWidth;
    yMultiplier = (xMultiplier * videoRatio) / canvasRatio;
  } else if (videoRatio < canvasRatio) {
    // video is taller than canvas
    yMultiplier = cHeight / vHeight;
    xMultiplier = (yMultiplier * canvasRatio) / videoRatio;
  }
}
