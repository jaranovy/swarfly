function addCircle(radius, segments) {
  if (segments < 1) {
    segments = 32;
  }
  console.log("Adding circle: " + radius)
  var existingInternalCad = scene.getObjectByName("Internal CAD", true);
  if (!existingInternalCad) {
    var fileObject = new THREE.Group();
  } else {
    fileObject = existingInternalCad;
  }
  var geometry = new THREE.CircleGeometry(radius, segments);
  geometry.vertices.shift();
  var endx = parseFloat(geometry.vertices[0].x)
  var endy = parseFloat(geometry.vertices[0].y)
  var endz = parseFloat(geometry.vertices[0].z)
  geometry.vertices.push(
    new THREE.Vector3(endx, endy, endz),
  );
  var material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide
  });

  var geometry2 = new THREE.Geometry();

  var r = parseFloat(radius);   // Swarfly: lower-left corner of the bounding box at X0 Y0, like every other shape
  for (i = 0; i < geometry.vertices.length; i++) {
    var x = parseFloat(geometry.vertices[i].x) + r
    var y = parseFloat(geometry.vertices[i].y) + r
    var z = parseFloat(geometry.vertices[i].z)
    geometry2.vertices.push(
      new THREE.Vector3(x, y, z),
    );
  }


  // geometry2.translate(radius, radius, 0)
  var circle = new THREE.Line(geometry2, material);
  circle.name = "circle"
  // circle.geometry.verticesNeedUpdate = true
  // circle.translateX(radius);
  // circle.translateY(radius);
  fileObject.add(circle);
  fileObject.name = "Internal CAD" + Math.random()
  if (!existingInternalCad) {
    objectsInScene.push(fileObject)
  }
  setTimeout(function() {
    fillTree();
    changePositionToGeoTranslate();
    resetView();
  }, 250);
}

function addRect(width, height) {
  var existingInternalCad = scene.getObjectByName("Internal CAD", true);
  if (!existingInternalCad) {
    var fileObject = new THREE.Group();
  } else {
    fileObject = existingInternalCad;
  }
  var rectgeom = new THREE.Geometry();
  rectgeom.vertices.push(new THREE.Vector3(0, 0, 0));
  rectgeom.vertices.push(new THREE.Vector3(0, height, 0));
  rectgeom.vertices.push(new THREE.Vector3(width, height, 0));
  rectgeom.vertices.push(new THREE.Vector3(width, 0, 0));
  rectgeom.vertices.push(new THREE.Vector3(0, 0, 0));
  // rectgeom.faces.push(new THREE.Face3(0, 1, 2));
  // rectgeom.faces.push(new THREE.Face3(0, 3, 2));
  var material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    side: THREE.DoubleSide
  });
  var rectangle = new THREE.Line(rectgeom, material);
  rectangle.name = "rectangle"
  fileObject.add(rectangle);
  fileObject.name = "Internal CAD" + Math.random()
  if (!existingInternalCad) {
    objectsInScene.push(fileObject)
  }
  setTimeout(function() {
    fillTree();
    changePositionToGeoTranslate();
    resetView();
  }, 250);
}

$(document).ready(function() {
  var modal = `

  <div class="dialog dark" data-overlay-click-close="true" data-role="dialog" id="addShapeCircle" data-to-top="true">
    <div class="dialog-title" id="statusTitle">Add shape: Circle</div>
    <div class="dialog-content">
    <form>
      <input type="number" class="form-control" id="circleRadius" value="10" data-role="input" data-append="mm" data-prepend="Radius" step="any">
      <br>
      <input type="number" class="form-control" id="circleSegments" value="32" data-role="input"  data-prepend="Segments" step="any">
      <small>Segments determines the smoothness of the circle, as circles are processed as Polylines</small>
    </form>
    </div>
    <div class="dialog-actions" id="statusFooter">
      <button class="button js-dialog-close">Cancel</button>
      <button type="button" class="button js-dialog-close success" id="CreateCircle">Create</button>
    </div>
  </div>

  <div class="dialog dark" data-overlay-click-close="true" data-role="dialog" id="addShapeRect" data-to-top="true">
		<div class="dialog-title" id="statusTitle">Add shape: Rectangle</div>
		<div class="dialog-content">
    <form>
      <input type="number" class="form-control" id="rectX" value="100" data-role="input" data-append="mm" data-prepend="Width" step="any">
      <br>
      <input type="number" class="form-control" id="rectY" value="50" data-role="input" data-append="mm" data-prepend="Height" step="any">
    </form>
		</div>
		<div class="dialog-actions" id="statusFooter">
			<button class="button js-dialog-close">Cancel</button>
      <button type="button" class="button js-dialog-close success" id="CreateRect">Create</button>
		</div>
	</div>
  `
  $("body").append(modal);

  $("#CreateCircle").on("click", function(event) {
    console.log("Clicked on CreateCircle")
    event.preventDefault();
    var radius = $("#circleRadius").val();
    var segments = $("#circleSegments").val();
    addCircle(radius, segments);
  });

  $("#CreateRect").on("click", function(event) {
    event.preventDefault();
    var width = $("#rectX").val();
    var height = $("#rectY").val();
    addRect(width, height);
  });

});
// ---- Swarfly: more shapes (geometry in js/shape-generators.js) -------------------------------------------------
// Adds a closed polyline given as [[x, y], ...] to the "Internal CAD" group, same way as addRect / addCircle.
function addPolyline(name, points) {
  var existingInternalCad = scene.getObjectByName("Internal CAD", true);
  var fileObject = existingInternalCad ? existingInternalCad : new THREE.Group();
  var geom = new THREE.Geometry();
  for (var i = 0; i < points.length; i++) {
    geom.vertices.push(new THREE.Vector3(points[i][0], points[i][1], 0));
  }
  var material = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
  var line = new THREE.Line(geom, material);
  line.name = name;
  fileObject.add(line);
  fileObject.name = "Internal CAD" + Math.random();
  if (!existingInternalCad) {
    objectsInScene.push(fileObject);
  }
  setTimeout(function() {
    fillTree();
    changePositionToGeoTranslate();
    resetView();
  }, 250);
}

function shapeDialog(id, title, fields, buttonId) {
  var inputs = fields.map(function(f) {
    return '<input type="number" class="form-control" id="' + f.id + '" value="' + f.value + '" data-role="input"' +
      (f.unit ? ' data-append="' + f.unit + '"' : '') + ' data-prepend="' + f.label + '" step="any"><br>';
  }).join("");
  return '<div class="dialog dark" data-overlay-click-close="true" data-role="dialog" id="' + id + '" data-to-top="true">' +
    '<div class="dialog-title">Add shape: ' + title + '</div><div class="dialog-content"><form>' + inputs + '</form></div>' +
    '<div class="dialog-actions"><button class="button js-dialog-close">Cancel</button>' +
    '<button type="button" class="button js-dialog-close success" id="' + buttonId + '">Create</button></div></div>';
}

// Reads the dialog fields, runs the generator and adds the shape; a bad value shows a red toast instead of a broken shape.
function createShapeFromDialog(name, build) {
  try {
    addPolyline(name, build());
  } catch (e) {
    Metro.toast.create(e.message, null, 5000, "bg-red");
  }
}

$(document).ready(function() {
  var num = function(id) { return parseFloat($("#" + id).val()); };
  $("body").append(
    shapeDialog("addShapeRoundRect", "Rounded rectangle", [
      { id: "rrW", value: 100, unit: "mm", label: "Width" },
      { id: "rrH", value: 50, unit: "mm", label: "Height" },
      { id: "rrR", value: 8, unit: "mm", label: "Corner radius" }
    ], "CreateRoundRect") +
    shapeDialog("addShapeEllipse", "Ellipse", [
      { id: "elRX", value: 30, unit: "mm", label: "Radius X" },
      { id: "elRY", value: 20, unit: "mm", label: "Radius Y" },
      { id: "elSeg", value: 64, label: "Segments" }
    ], "CreateEllipse") +
    shapeDialog("addShapePolygon", "Polygon", [
      { id: "pgN", value: 6, label: "Sides" },
      { id: "pgR", value: 20, unit: "mm", label: "Radius (to corners)" }
    ], "CreatePolygon") +
    shapeDialog("addShapeStar", "Star", [
      { id: "stN", value: 5, label: "Points" },
      { id: "stR", value: 25, unit: "mm", label: "Outer radius" },
      { id: "str", value: 10, unit: "mm", label: "Inner radius" }
    ], "CreateStar") +
    shapeDialog("addShapeSlot", "Slot", [
      { id: "slL", value: 60, unit: "mm", label: "Length" },
      { id: "slW", value: 12, unit: "mm", label: "Width" }
    ], "CreateSlot")
  );
  $("#CreateRoundRect").on("click", function(e) { e.preventDefault(); createShapeFromDialog("rounded rectangle", function() { return shapeRoundedRect(num("rrW"), num("rrH"), num("rrR"), 8); }); });
  $("#CreateEllipse").on("click", function(e) { e.preventDefault(); createShapeFromDialog("ellipse", function() { return shapeEllipse(num("elRX"), num("elRY"), num("elSeg")); }); });
  $("#CreatePolygon").on("click", function(e) { e.preventDefault(); createShapeFromDialog("polygon", function() { return shapePolygon(num("pgN"), num("pgR")); }); });
  $("#CreateStar").on("click", function(e) { e.preventDefault(); createShapeFromDialog("star", function() { return shapeStar(num("stN"), num("stR"), num("str")); }); });
  $("#CreateSlot").on("click", function(e) { e.preventDefault(); createShapeFromDialog("slot", function() { return shapeSlot(num("slL"), num("slW"), 16); }); });
});
