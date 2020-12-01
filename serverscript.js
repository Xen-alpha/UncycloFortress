
// ----------------------------------------------------------------------------------------------------
// --------------------------- UncycloFortress Dedicated Server Script --------------------------------
// ----------------------------------------------------------------------------------------------------
//----------------------------------mapinfo and object definition------------------------------
// Objects must also be defined in server-side javascript
function GameRule(RedClock, BlueClock, initialstate) {
	this.state = initialstate; // 0: game ceased, 1: game setup, 2: game on!, 3: round end
	this.RedClock = RedClock;
	this.BlueClock = BlueClock;
	this.currentdominating = 0; // 0: neutral, 1: red, 2:blue
	this.reddominatingprogress = 0;
	this.bluedominatingprogress = 0;
}
let GameObject = require("./GameObject");
class Projectile extends GameObject {
	constructor(pos, size, direction, team, shooter, imgsrc, type = 0) {
		super(pos, size, direction, team, 1, 0, 1);
		this.type = type;
		this.movespeed = 4;
		this.shooter = shooter;
		this.imgsrc = imgsrc;
		this.visible = true;
	}
}
const MAX_PROJECTILE_PER_PLAYER = 100;
const MAX_PROJECTILE_NUMBER = 100 * MAX_PROJECTILE_PER_PLAYER;
let projectilelist = [];
class Player extends GameObject {
	constructor(pos, size, direction, team, health, id = 0, isdead = false, playername = "unknown player" , classnum = 0) {
		super(pos, size, direction, team, 1, 0, health);
		this.playername = playername;
		this.playerID = id;
		this.movespeed = 1;
		this.classnumber = classnum;
		this.canbedamaged = true;
		this.isdead = isdead;
		this.reloadDelaying = false;
		this.currentweapon = 0;
		this.secondweapon = undefined; // weapon 0
		this.firstweapon = undefined; // weapon 1
		this.raylist = []; // remember, this only has MAX_RAY_PER_PLAYER number of elements
		this.deadtimer;
	}
	ReloadWeapon() {
		if (this.currentweapon == 0) {
			this.secondweapon.ReloadWeapon();
		} else {
			this.firstweapon.ReloadWeapon();
		}
	}
	FireWeapon () {
		if (this.currentweapon == 0) {
			this.secondweapon.FireWeapon();
		} else {
			this.firstweapon.FireWeapon();
		}
	}
	DoSpecialSkill () {
		if (this.currentweapon == 0) {
			this.secondweapon.ReleaseFire();
		} else {
			this.firstweapon.ReleaseFire();
		}
	}
	ReleaseFire() {
		return;
	}
}
class Healthkit extends GameObject {
	constructor(pos, size, id) {
		super(pos, size, 0, 0, 1, 1, 0);
		this.id = id;
		this.respawntimer = undefined;
		this.respawntime = 8000;
		this.isSpawned = true;
	}
	respawn(id) {
		this.isSpawned = true;
		broadcast(JSON.stringify({
			type: 17,
			id: -2,
			healthkitid: id,
			isSpawned: true
		}));
		return;
	}
}
class Door extends GameObject {
	constructor(pos, size, direction, team) {
		super(pos, size, direction, team, 0, 0, 100000);
	}
}
class Building extends Player {
	constructor(pos, size, direction, team, health, id = 0) {
		super(pos, size, direction, team, health, id);
	}
}
const mapobjectsizeconstant = 32;
function MapInfo (text) { // map infomation
	  this.rawmapdata = text;
	  this.RedSpawn = [0, 0];
	  this.BlueSpawn = [0, 0];
	  let mapdataarray = this.rawmapdata.split('\n');
	  let mapsize = mapdataarray[0].split(' ');
	  this.mapheight = parseInt(mapsize[0]);
	  this.mapwidth = parseInt(mapsize[1]);
	  this.mapversion = parseInt(mapsize[2]);
	  this.mapdata = mapdataarray;
	  this.mapwallcounter = 0;
	  this.mapobjectlist = [];
	  this.maphealthkitlist = [];
	  let mapX = 64* this.mapwidth;
	  let mapY = 64* this.mapheight;
	  for (let i = 1; i <= this.mapheight; i++) {
		for (let j = 0; j < this.mapwidth; j++){
			switch (this.mapdata[i][j]) {
				case 'R':
					this.RedSpawn = [ mapobjectsizeconstant*j,  mapobjectsizeconstant*(i-1)];
					break;
				case 'B':
					this.BlueSpawn = [ mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)];
					break;
				case 'W':
					this.mapobjectlist.push(new GameObject([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],0, 0, 0, 0)); 
					break;
				case 'Q':
					this.mapobjectlist.push(new GameObject([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],0, 0, 0, 2)); 
					break;
				case 'A':
					this.mapobjectlist.push(new GameObject([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],0, 0, 0, 1)); 
					break;
				case 'H':
					this.maphealthkitlist.push(new Healthkit([mapobjectsizeconstant*j + 8, mapobjectsizeconstant*(i-1) +8], 8, this.maphealthkitlist.length));
					break;
				case 'Z':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],270, 2));
					break;
				case 'X':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],90, 2));
					break;
				case 'C':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],180, 2));
					break;
				case 'V':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],0, 2));
					break;
				case 'U':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],270, 1));
					break;
				case 'I':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],90, 1));
					break;
				case 'O':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],180, 1));
					break;
				case 'P':
					this.mapobjectlist.push(new Door([mapobjectsizeconstant*j, mapobjectsizeconstant*(i-1)], [mapobjectsizeconstant, mapobjectsizeconstant],0, 1));
					break;
				default:
					break; // do nothing
			}
		}
	  }
}

function AreaEquation(centerpos, firstcornerpos, secondcornerpos) { // 3 dimensional position
	this.point = centerpos;
	this.normalvector = m4.cross([centerpos[0]-firstcornerpos[0],centerpos[1]-firstcornerpos[1],centerpos[2]-firstcornerpos[2]], [centerpos[0]-secondcornerpos[0],centerpos[1]-secondcornerpos[1],centerpos[2]-secondcornerpos[2]]);
}
function LineEquation(startpos, endpos) { // 3 dimensional position
	this.point = startpos;
	this.linevector = [endpos[0] - startpos[0],endpos[1] - startpos[1],endpos[2] - startpos[2]];
}
function CylinderEquation(center, radius) {
	this.centerpos = center;
	this.radius = radius;
}
const MAX_RAY_PER_PLAYER = 10;
const MAX_RAY_NUM = 32 * MAX_RAY_PER_PLAYER;
function Ray (startpos, endpos) {
	this.visible = false;
	this.startpos = startpos; // array
	this.endpos = endpos; // array
	this.collidedobjectsinfo = []; // will contain list of GameObject objects and their penetrated positions
	this.AddPenetratingObjects = (objectlist) => {
		for (let object of objectlist){
			let lineeq = new LineEquation(this.startpos, this.endpos);
			if (object.collidetype == 0) { // cubic -> doing collision check 4 times
				let areaeq1 = new AreaEquation([object.GetCenterPosition()[0]-object.size[0]/2, object.GetCenterPosition()[1],0], [object.GetCenterPosition()[0]-object.size[0]/2, object.GetCenterPosition()[1]-object.size[1]/2,mapobjectsizeconstant/2],[object.GetCenterPosition()[0]-object.size[0]/2, object.GetCenterPosition()[1]-object.size[1]/2,-mapobjectsizeconstant/2]);
				let resultArray = LineTrace_Sub1(lineeq, areaeq1);
				if (resultArray.length > 0 && resultArray[1] >= object.GetCenterPosition()[1]-object.size[1]/2 && resultArray[1] <= object.GetCenterPosition()[1]+object.size[1]/2) this.collidedobjectsinfo.push([object, resultArray]);
				let areaeq2 = new AreaEquation([object.GetCenterPosition()[0], object.GetCenterPosition()[1]-object.size[1]/2,0], [object.GetCenterPosition()[0]-object.size[0]/2, object.GetCenterPosition()[1]-object.size[1]/2,mapobjectsizeconstant/2],[object.GetCenterPosition()[0]-object.size[0]/2, object.GetCenterPosition()[1]-object.size[1]/2,-mapobjectsizeconstant/2]);
				resultArray = LineTrace_Sub1(lineeq, areaeq2);
				if (resultArray.length > 0 && resultArray[0] >= object.GetCenterPosition()[0]-object.size[0]/2 && resultArray[0] <= object.GetCenterPosition()[0]+object.size[0]/2) this.collidedobjectsinfo.push([object, resultArray]);
				let areaeq3 = new AreaEquation([object.GetCenterPosition()[0]+object.size[0]/2, object.GetCenterPosition()[1],0], [object.GetCenterPosition()[0]+object.size[0]/2, object.GetCenterPosition()[1]+object.size[1]/2,mapobjectsizeconstant/2],[object.GetCenterPosition()[0]+object.size[0]/2, object.GetCenterPosition()[1]+object.size[1]/2,-mapobjectsizeconstant/2]);
				resultArray = LineTrace_Sub1(lineeq, areaeq3);
				if (resultArray.length > 0 && resultArray[1] >= object.GetCenterPosition()[1]-object.size[1]/2 && resultArray[1] <= object.GetCenterPosition()[1]+object.size[1]/2) this.collidedobjectsinfo.push([object, resultArray]);
				let areaeq4 = new AreaEquation([object.GetCenterPosition()[0], object.GetCenterPosition()[1]+object.size[1]/2,0], [object.GetCenterPosition()[0]+object.size[0]/2, object.GetCenterPosition()[1]+object.size[1]/2,mapobjectsizeconstant/2],[object.GetCenterPosition()[0]+object.size[0], object.GetCenterPosition()[1]+object.size[1],-mapobjectsizeconstant/2]);
				resultArray = LineTrace_Sub1(lineeq, areaeq4);
				if (resultArray.length > 0 && resultArray[0] >= object.GetCenterPosition()[0]-object.size[0]/2 && resultArray[0] <= object.GetCenterPosition()[0]+object.size[0]/2) this.collidedobjectsinfo.push([object, resultArray]);
			} else if (object.collidetype == 1){ // cylinder -> only find success/fail
				let cylindereq = new CylinderEquation(object.GetCenterPosition(), object.size);
				let hitpoint = LineTrace_Sub2(lineeq, cylindereq);
				if ((hitpoint[0] - this.startpos[0]) * (hitpoint[0] - this.startpos[0]) + (hitpoint[1] - this.startpos[1]) + (hitpoint[2] - this.startpos[2]) * (hitpoint[2] - this.startpos[2]) < (this.endpos[0] - this.startpos[0]) * (this.endpos[0] - this.startpos[0]) + (this.endpos[1] - this.startpos[1]) * (this.endpos[1] - this.startpos[1]) + (this.endpos[2] - this.startpos[2]) * (this.endpos[2] - this.startpos[2]) ) this.collidedobjectsinfo.push([object, hitpoint]);
			}
		}
	}
	this.GetClosestCollidedPosition = () => { // only find cube collided position;
		let collidedposition = this.endpos;
		for (let objectinfo of this.collidedobjectsinfo) {
			if (objectinfo.length > 1) {
				let line1 = new LineEquation(this.startpos, objectinfo[1]);
				let criterionline = new LineEquation(this.startpos, this.endpos);
				if (m4.normalize(criterionline.linevector)[0] * m4.normalize(line1.linevector)[0] >0 && GetLineLength(this.startpos, objectinfo[1]) <= GetLineLength(this.startpos, collidedposition)) collidedposition = objectinfo[1];
			}
		}
		return collidedposition;
	}
	this.GetClosestCollidedObject = (rayownerid = -1) => { // only find cube collided position;
		let collidedposition = this.endpos;
		let collidedobject= undefined;
		for (let objectinfo of this.collidedobjectsinfo) {
			if (objectinfo[0].constructor == Player && objectinfo[0].playerID == rayownerid) continue;
			if (objectinfo.length > 1) {
				let line1 = new LineEquation(this.startpos, objectinfo[1]);
				let criterionline = new LineEquation(this.startpos, this.endpos);
				if (m4.normalize(criterionline.linevector)[0] * m4.normalize(line1.linevector)[0] >0 && GetLineLength(this.startpos, objectinfo[1]) <= GetLineLength(this.startpos, collidedposition)) {
					collidedposition = objectinfo[1];
					collidedobject = objectinfo[0];
				}
			}
		}
		return collidedobject;
	}
	this.DrawRay = () => {
		this.visible = true;
		setTimeout(this.DrawRay_timeout, 50);
		return;
	}
	this.DrawRay_timeout = () => {
		this.visible = false;
		return;
	}
};
// -----------------------------------------------global data-------------------------------------------
const up = [0, 1, 0];

// player state
let heightcount = 0;
// --------------------------------------------global function -----------------------------------------------
let m4 = {
	cross: function (a, b) {
		return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
	},
	subtractVectors: function (a, b) {
		return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
	},
	normalize: function (v) {
		var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
		// make sure we don't divide by 0.
		if (length > 0.00001) {
		return [v[0] / length, v[1] / length, v[2] / length];
		} else {
		return [0, 0, 0];
		}
	}
};

String.format = function() {
	// The string containing the format items (e.g. "{0}")
	// will and always has to be the first argument.
	var theString = arguments[0];
	// start with the second argument (i = 1)
	for (var i = 1; i < arguments.length; i++) {
		// "gm" = RegEx options for Global search (more than one instance)
		// and for Multiline search
		var regEx = new RegExp("\\{" + (i - 1) + "\\}", "gm");
		theString = theString.replace(regEx, arguments[i]);
	}
	return theString;
}

function radToDeg(r) {
    return r * 180 / Math.PI;
}

function degToRad(d) {
return d * Math.PI / 180;
}

function LineTrace_Sub1(lineeq, areaeq) {
	if (lineeq.linevector[0] * areaeq.normalvector[0] + lineeq.linevector[1] * areaeq.normalvector[1] == 0) return [];
	let t = -(areaeq.normalvector[0]*(lineeq.point[0]-areaeq.point[0]) + areaeq.normalvector[1]*(lineeq.point[1]-areaeq.point[1]) + areaeq.normalvector[2]*(lineeq.point[2]-areaeq.point[2])) / (areaeq.normalvector[0]*lineeq.linevector[0] + areaeq.normalvector[1]*lineeq.linevector[1] +areaeq.normalvector[2]*lineeq.linevector[2]);
	return [lineeq.linevector[0]*t + lineeq.point[0], lineeq.linevector[1]*t + lineeq.point[1],lineeq.linevector[2]*t + lineeq.point[2]];
}
function LineTrace_Sub2(lineeq, cylindereq) {
	let a = lineeq.linevector[0];
	let b = lineeq.linevector[1];
	let c = cylindereq.centerpos[0] - lineeq.point[0];
	let d = cylindereq.centerpos[1] - lineeq.point[1];
	let t1 = (a*c + b* d + Math.sqrt( (a*c + b*d) * (a*c + b*d) - (a*a + b*b) * (c*c + d* d - cylindereq.radius * cylindereq.radius) )) / (a*a + b*b);
	let t2 = (a*c + b* d - Math.sqrt( (a*c + b*d) * (a*c + b*d) - (a*a + b*b) * (c*c + d* d - cylindereq.radius * cylindereq.radius) )) / (a*a + b*b);
	let dx1 = a * t1;
	let dy1 = b * t1;
	let dx2 = a * t2;
	let dy2 = b * t2;
	return dx1*dx1+ dy1*dy1 < dx2*dx2 + dy2*dy2 ? [dx1 + lineeq.point[0], dy1 + lineeq.point[1], lineeq.linevector[2]* t1 + lineeq.point[2]] : [dx2 + lineeq.point[0], dy2 + lineeq.point[1], lineeq.linevector[2]* t2 + lineeq.point[2]];
}
function GetLineLength(startpos, endpos) {
	return Math.sqrt((endpos[0] - startpos[0])* (endpos[0] - startpos[0]) + (endpos[1] - startpos[1]) * (endpos[1] - startpos[1]) + (endpos[2] - startpos[2]) * (endpos[2] - startpos[2]));
}

let scriptversion = 0.1;

const maptextdata = "25 45 1\n\
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n\
AFFFFFPFFFFFFFFFFFFAFFFFFFFFFAFFFFFFFFFFFFFFW\n\
AFFFFFPFFFFFFFFFFFFWFFFFFFFFFWFFFFFFFFFFFFFFW\n\
AFFRFFAAAFFFFFFFFFFFFFFFFFFFFFFFFFFFAAAAAFFFW\n\
AFFFFHAFFFFFFFFFFFFWFFFFHFFFFWFFFFFFFFFFWFFFW\n\
AFFFHHAFFFFFFFFWAAAAAAAAAAAAAWFFFFFFFFFFWFFFW\n\
AIIAAAAFFFFFFFFFFFFFFFFFFFFFFWFFFFFFFFFFWFFFW\n\
AFFAFFFFFFFFFFFWFFFAAAAAAAFFFWWWWWWFFFFFWFFFW\n\
AFFAFFFFFFFAAAAWFFFFFFFFFFFFFFFFFFFFFFFFFFFFW\n\
AFFFFFFFFFFFFFFWFFFFFFFFFFFFFFFFFFFFFFFFFFFFW\n\
AFFFFFFFFFFFFFFWWWWWFFFFFWWWFFFFFFAWWWWHFFFFW\n\
WWWWFFFFFFAFFFFFFWFFFFFFFFFWFFFFFFAFFFFFFFFFW\n\
WFFFFFFFFFAFFFFFFFFFFFTFFFFFFFFFFFQFFFFFFFFFW\n\
WFFFFFFFFFQFFFFFFWFFFFFFFFFWFFFFFFQFFFFFFWWWW\n\
WFFFFHWWWWQFFFFFFWWWFFFFFWWWWWFFFFFFFFFFFFFFQ\n\
WFFFFFFFFFFFFFFFFFFFFFFFFFFFFWFFFFFFFFFFFFFFQ\n\
WFFFFFFFFFFFFFFFFFFFFFFFFFFFFWQQQQFFFFFFFQFFQ\n\
WFFFWFFFFFWWWWWWFFFQQQQQQQFFFWFFFFFFFFFFFQFFQ\n\
WFFFWFFFFFFFFFFWFFFFFFFFFFFFFFFFFFFFFFQQQQZZQ\n\
WFFFWFFFFFFFFFFWQQQQQQQQQQQQQWFFFFFFFFQHHFFFQ\n\
WFFFWFFFFFFFFFFWFFFFHFFFFWFFFFFFFFFFFFQHFFFFQ\n\
WFFFQQQQQFFFFFFFFFFFFFFFFFFFFFFFFFFFQQQFFBFFQ\n\
WFFFFFFFFFFFFFFWFFFFFFFFFWFFFFFFFFFFFFCFFFFFQ\n\
WFFFFFFFFFFFFFFQFFFFFFFFFQFFFFFFFFFFFFCFFFFFQ\n\
QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ";

let clients = [];
let players
let blueteamnum = 0;
let redteamnum = 0;
let mapinfo = new MapInfo(maptextdata); // map information object
let gamerule = new GameRule(180,180,0);

let WebSocketServer = require("websocket").server;
let server = require("http").createServer();

let websocket = new WebSocketServer({httpServer : server, autoAcceptConnections: true});

console.log("8080 포트에서 서버 실행");

server.listen(8080);

function broadcast(data) {
	for (let client of clients) {
		client.send(data);
	}
	return;
}
function broadcastExceptSpecificClient(clientid, data) {
	for (let client of clients) {
		if (clients.indexOf(client) == clientid) continue;
		client.send(data);
	}
	return;
}
websocket.on("connect", connectHandler);
setInterval(tickHandler, 10);
// connect signal handler : add player from player list or not

function connectHandler(conn) {
	if (clients.length < 32){
		conn.id = clients.length;
		conn.score = 0;
		conn.on("message", messageHandler);
		conn.on("close", closeHandler);
		
		console.log("client " + conn.id + "("+ conn.remoteAddress +") connected");
		let teamnumber = 0;
		if (blueteamnum > redteamnum) teamnumber = 1;
		else if (blueteamnum < redteamnum) teamnumber = 2;
		else {
			let randomNumber = Math.floor(Math.random() *2);
			if (randomNumber == 0) teamnumber = 1;
			else teamnumber = 2;
		}
		conn.playerinfo = new Player([128, 128], 12, 0, teamnumber, 1,conn.id, true, "unknown player" , 0 );
		if (teamnumber == 1) {
			conn.playerinfo.pos = mapinfo.RedSpawn;
		} else {
			conn.playerinfo.pos = mapinfo.BlueSpawn;
		}
		if (teamnumber == 1) {
			redteamnum += 1;
		}
		else if (teamnumber == 2) {
			blueteamnum += 1;
		}
		clients.push(conn);
		// send initial player info
		conn.send(JSON.stringify({type:8,
			id:conn.id,
			pos: conn.playerinfo.pos,
			direction: conn.playerinfo.direction,
			team: teamnumber,
			classnum: conn.playerinfo.classnumber,
			canbedamaged: conn.playerinfo.canbedamaged,
			health: conn.playerinfo.healthpoint,
			isdead: conn.playerinfo.isdead
		}));
		conn.send(JSON.stringify({type:14})); // request client's map version
		// check script version
		conn.send(JSON.stringify({type: 21}));
		// send every player list to connected player
		let playerlistarray = [];
		for (let client of clients) {
			playerlistarray.push({
				id: client.playerinfo.playerID,
				pos: client.playerinfo.pos,
				direction: client.playerinfo.direction,
				team: client.playerinfo.team,
				health: client.playerinfo.healthpoint,
				playername: client.playerinfo.playername,
				classnumber: client.playerinfo.classnumber,
				isdead: client.playerinfo.isdead
			});
		}
		conn.send(JSON.stringify({
			type: 0,
			playerlist: playerlistarray
		}));
		// say everyone that a player is connected
		broadcast(JSON.stringify({type:1,
			id:conn.id,
			pos: conn.playerinfo.pos,
			direction: conn.playerinfo.direction,
			team: teamnumber,
			classnum: conn.playerinfo.classnumber,
			canbedamaged: conn.playerinfo.canbedamaged,
			health: conn.playerinfo.healthpoint,
			isdead: conn.playerinfo.isdead
		}));
		broadcast(JSON.stringify({type:16, redteam: redteamnum, blueteam: blueteamnum}));
	} else {
		conn.send(JSON.stringify({type:3, message:"죄송합니다. 서버 인원이 가득찼어요.."}));
	}
}
// close signal handler : remove player from player list
function closeHandler() {
	let index = clients.indexOf(this);
	if (index > -1) { // only validated player in server will be removed
		clearTimeout(clients[index].playerinfo.deadtimer); // cancel the respawn timer
		let teamnumber = clients[index].playerinfo.team;
		if (teamnumber == 1) {
			redteamnum -= 1;
		}
		else if (teamnumber == 2) {
			blueteamnum -= 1;
		}
		broadcast(JSON.stringify({type:2, id:index}));
		clients.splice(index, 1);
		console.log("client "+ index +"("+ this.remoteAddress + ") disconnected...");
		for (let i in clients) {
			clients[i].id = i;
		}
		broadcast(JSON.stringify({type:16, redteam: redteamnum, blueteam: blueteamnum}));
	}
}

function tickHandler(){
	// Update gamerule
	// send message type 7
	let projectiles = [];
	for (let projectile of projectilelist) {
		projectiles.push({
			shooterid: projectile.shooter.playerID,
			pos: projectile.pos,
			direction: projectile.direction,
			team: projectile.team,
			type: projectile.type
		});
	}
	broadcast(JSON.stringify({
			type: 7,
			projectilelist: projectiles
		}));
	// move projectile and check collision
	for (let projectile of projectilelist) {
		let freeToMove = true;
		for (let mapobject of mapinfo.mapobjectlist) {
			let tempmapobject = new GameObject([mapobject.pos[0] - projectile.movespeed*Math.cos(projectile.direction), mapobject.pos[1] - projectile.movespeed*Math.sin(projectile.direction) ], mapobject.size, mapobject.direction, mapobject.team, mapobject.collidetype, mapobject.flag, mapobject.healthpoint);
			if (tempmapobject.team != projectile.team && projectile.IsColliding(tempmapobject)) freeToMove = false;
		}
		for (let client of clients) {
			if (projectile.shooter.playerID == client.playerinfo.playerID){ continue;}
			let tempplayer = new Player([client.playerinfo.pos[0] - projectile.movespeed*Math.cos(projectile.direction), client.playerinfo.pos[1] - projectile.movespeed*Math.sin(projectile.direction)], 12, client.playerinfo.direction, client.playerinfo.team, client.playerinfo.healthpoint, client.playerinfo.playerID, client.playerinfo.isdead, client.playerinfo.playername, client.playerinfo.classnumber);
			if (!tempplayer.isdead && projectile.IsColliding(tempplayer)) {
				freeToMove = false;
			}
		}
		if (!freeToMove){
			// make a explosion if needed
			if (projectile.type == 0) {
				let explosion = new GameObject (projectile.pos, 20, 0, projectile.shooter.team, 1, 0, 100);
				explosion.SetCenterPosition(projectile.GetCenterPosition());
				// find all player that take damage
				for (let client of clients) {
					if ( !client.playerinfo.isdead && explosion.team != client.playerinfo.team && explosion.IsColliding(client.playerinfo)) {
						// send damage message
						if (client.playerinfo.canbedamaged && client.playerinfo.healthpoint > 90) {
							client.playerinfo.healthpoint -= 90;
							broadcast(JSON.stringify({
								type:11,
								damage: 90,
								isdead: false,
								victimID: client.playerinfo.playerID
							}));
						} else if (client.playerinfo.canbedamaged) {
							client.playerinfo.healthpoint = 0;
							client.playerinfo.isdead = true;
							clearTimeout(client.playerinfo.deadtimer);
							client.playerinfo.deadtimer = setTimeout(deadStateHandler, 4000, client.playerinfo.playerID);
							broadcast(JSON.stringify({
								type:10,
								killtype: 6,
								attackerID: projectile.shooter.playerID,
								victimID: client.playerinfo.playerID
							}));
							broadcast(JSON.stringify({
								type:11,
								damage: 0,
								isdead: true,
								victimID: client.playerinfo.playerID
							}));
						}
					}
					broadcast(JSON.stringify({
						type:12,
						pos: [projectile.GetCenterPosition()[0] - 16, projectile.GetCenterPosition()[1] - 16],
						radius: 16,
						explosiontype: 0
					}));
				}
			}
			// remove projectile from projectilelist
			projectilelist.splice(projectilelist.indexOf(projectile), 1);
		} else {
			projectile.updatePosition(0, projectile.pos[0] + projectile.movespeed*Math.cos(projectile.direction-Math.PI/2));
			projectile.updatePosition(2, projectile.pos[1] + projectile.movespeed*Math.sin(projectile.direction-Math.PI/2));
		}
	} 
	
}

///////////////////////////////////////////////////////////////////////////////////////////////
// ---------------------------------Server-side message----------------------------------------
// --------------------------------------------------------------------------------------------
// -------------------------------type of sending message--------------------------------------
// 0: list of players (do not use this frequently)
// 1: connection notice
// 2: disconnection notice
// 3: connection rejected(due to server player number limit or else)
// 4: reserved for chat
// 5: player's current status renewal
// 6: send all fired ray
// 7: send all fired projectilelist
// 8: initial player information
// 9: reserved for game objective(GameRule related)
// 10: kill log event
// 11: damaging event
// 12: explosion event
// 13: reserved for list of building
// 14: map version request
// 15: player name change event
// 16: reply to teammate number request
// 17: Healthkit touch event reply (broadcast)
// 18: sound play request
// 19: sound stop request
// 20: respawn event
// 21: scriptversion request
// 22: weapon change notice
// --------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------
// -------------------------------type of receiving message------------------------------------
// 0: request for all player's status
// 1: map version
// 2: player name set request
// 3: class change request
// 4: reserved for chat
// 5: player current position, looking direction info
// 6: fired ray info
// 7: fired projectile info
// 8: reserved for all building's current status
// 9: reserved for building repair
// 10: reserved for building destruction
// 11: heal event request
// 12: teammate number request
// 13: reload request
// 14: script version
// 15: Special skill request(include building construction, zoom in, etc.)
// 16: Weapon change request
// --------------------------------------------------------------------------------------------

function messageHandler(message) {
	let messageinfo = JSON.parse(message.utf8Data);
	switch (messageinfo.type) {
		case 0: // we will assume that this message type comes rarely
			let playerid = messageinfo.playerid;
			let playerlistarray = [];
			for (let client of clients) {
				playerlistarray.push({
					id: client.playerinfo.playerID,
					pos: client.playerinfo.pos,
					direction: client.playerinfo.direction,
					team: client.playerinfo.team,
					health: client.playerinfo.healthpoint,
					playername: client.playerinfo.playername,
					classnumber: client.playerinfo.classnumber,
					isdead: client.playerinfo.isdead
				});
			}
			let jsondata = {
				type: 0,
				playerlist: playerlistarray
			};
			if ( clients[playerid] == undefined ) return;
			clients[playerid].send(JSON.stringify(jsondata));
			break;
		case 1:
			if( clients[messageinfo.id] == undefined) return;
			if (messageinfo.mapversion != mapinfo.mapversion) {
				clients[messageinfo.id].send(JSON.stringify({type:3, message:"서버의 맵과 클라이언트 맵 버전이 다릅니다"}));
			}
			break;
		case 2:
			if( clients[messageinfo.id] == undefined) return;
			clients[messageinfo.id].playerinfo.playername = messageinfo.newname;
			broadcast(JSON.stringify({type:15, id: messageinfo.id, newname: messageinfo.newname}));
			break;
		case 3:
			if( clients[messageinfo.id] == undefined) return;
			clients[messageinfo.id].playerinfo = new Player([clients[messageinfo.id].playerinfo.pos[0]+4, clients[messageinfo.id].playerinfo.pos[1]+4], 12, 0, clients[messageinfo.id].playerinfo.team, 100, clients[messageinfo.id].playerinfo.playerID, true, clients[messageinfo.id].playerinfo.playername, messageinfo.classnum);
			if (clients[messageinfo.id].playerinfo.team == 1) {
				clients[messageinfo.id].playerinfo.direction = degToRad(0);
			} else {
				clients[messageinfo.id].playerinfo.direction = degToRad(180);
			}
			switch(messageinfo.classnum) {
				case 1:
					clients[messageinfo.id].playerinfo.healthpoint = 100;
					clients[messageinfo.id].playerinfo.maxhealthpoint = 100;
					clients[messageinfo.id].playerinfo.secondweapon = GetMyNewWeapon(0, clients[messageinfo.id].playerinfo); // weapon 0
					clients[messageinfo.id].playerinfo.firstweapon = GetMyNewWeapon(4, clients[messageinfo.id].playerinfo); // weapon 1
					clients[messageinfo.id].playerinfo.movespeed = 2;
					break;
				case 2:
					clients[messageinfo.id].playerinfo.healthpoint = 300;
					clients[messageinfo.id].playerinfo.maxhealthpoint = 300;
					clients[messageinfo.id].playerinfo.secondweapon = GetMyNewWeapon(0, clients[messageinfo.id].playerinfo); // weapon 0
					clients[messageinfo.id].playerinfo.firstweapon = GetMyNewWeapon(5, clients[messageinfo.id].playerinfo); // weapon 1
					clients[messageinfo.id].playerinfo.movespeed = 0.5;
					break;
				case 3:
					clients[messageinfo.id].playerinfo.healthpoint = 200;
					clients[messageinfo.id].playerinfo.maxhealthpoint = 200;
					clients[messageinfo.id].playerinfo.secondweapon = GetMyNewWeapon(0, clients[messageinfo.id].playerinfo); // weapon 0
					clients[messageinfo.id].playerinfo.firstweapon = GetMyNewWeapon(6, clients[messageinfo.id].playerinfo); // weapon 1
					clients[messageinfo.id].playerinfo.movespeed = 1;
					break;
				default:
					//only possible in initial entrance
					break;
			}
			console.log("respawning client " + messageinfo.id + " at " + clients[messageinfo.id].playerinfo.pos);
			clearTimeout(clients[messageinfo.id].playerinfo.deadtimer);
			clients[messageinfo.id].playerinfo.deadtimer = setTimeout(deadStateHandler, 4000, messageinfo.id);
			break;
		case 4:
			// reserved for chat
			break;
		case 5: // player current pos, direction
			if (messageinfo.id >= 0 && clients[messageinfo.id] != undefined) {
				clients[messageinfo.id].playerinfo.pos = messageinfo.pos;
				clients[messageinfo.id].playerinfo.direction = messageinfo.direction;
				// check if client touch map's healthkit
				for (let healthkit of mapinfo.maphealthkitlist) {
					if (clients[messageinfo.id].playerinfo.healthpoint < clients[messageinfo.id].playerinfo.maxhealthpoint && clients[messageinfo.id].playerinfo.IsColliding(healthkit)) {
						clients[messageinfo.id].playerinfo.healthpoint = clients[messageinfo.id].playerinfo.maxhealthpoint;
						broadcast(JSON.stringify({
							type: 17,
							id: messageinfo.id,
							healthkitid: healthkit.id,
							isSpawned: false
						}));
						clearTimeout(healthkit.respawntimer);
						healthkit.respawntimer = setTimeout(healthkit.respawn, healthkit.respawntime, healthkit.id);
					}
				}
				broadcast(JSON.stringify({
					type:5,
					id:messageinfo.id,
					pos: messageinfo.pos,
					direction: messageinfo.direction,
					team: clients[messageinfo.id].playerinfo.team,
					classnum: clients[messageinfo.id].playerinfo.classnumber,
					canbedamaged: clients[messageinfo.id].playerinfo.canbedamaged,
					health: clients[messageinfo.id].playerinfo.healthpoint,
					isdead: clients[messageinfo.id].playerinfo.isdead
				}));
			}
			break;
		case 6:
			// ray list changed
			for (let ray of messageinfo.raylist) {
				let realray = new Ray (ray.startpos, ray.endpos);
				realray.AddPenetratingObjects(mapinfo.mapobjectlist);
				let playerlist = [];
				for (let client of clients) {
					playerlist.push(client.playerinfo);
				}
				realray.AddPenetratingObjects(playerlist);
				let collidedObject = realray.GetClosestCollidedObject(messageinfo.id);
				if (collidedObject != undefined && collidedObject.constructor == Player) { // collided to player
					// send damage message
					if (clients[collidedObject.playerID].playerinfo.canbedamaged && clients[collidedObject.playerID].playerinfo.healthpoint > 10) {
						clients[collidedObject.playerID].playerinfo.healthpoint -= 10;
						broadcast(JSON.stringify({
							type:11,
							damage: 10,
							isdead: false,
							victimID: collidedObject.playerID
						}));
					} else if (clients[collidedObject.playerID].playerinfo.canbedamaged) {
						clients[collidedObject.playerID].playerinfo.healthpoint = 0;
						clients[collidedObject.playerID].playerinfo.isdead = true;
						clearTimeout(clients[collidedObject.playerID].playerinfo.deadtimer);
						clients[collidedObject.playerID].playerinfo.deadtimer = setTimeout(deadStateHandler, 4000, collidedObject.playerID);
						let killtype = -2;
						switch(clients[messageinfo.id].playerinfo.classnumber) {
							case 1:
								if (clients[messageinfo.id].playerinfo.currentweapon == 0) killtype = 0; // pistol kill
								else killtype = 4; // power shotgun kill
								break;
							case 2:
								if (clients[messageinfo.id].playerinfo.currentweapon == 0) killtype = 0; // pistol kill
								else killtype = 5; // minigun kill
								break;
							case 3:
								killtype = 0; // only killed by shooting pistol
								break;
							default:
								break;
						}
						broadcast(JSON.stringify({
							type:10,
							killtype: killtype,
							attackerID: messageinfo.id,
							victimID: collidedObject.playerID
						}));
						broadcast(JSON.stringify({
							type:11,
							damage: 0,
							isdead: true,
							victimID: collidedObject.playerID
						}));
					}
				}
				ray.endpos = realray.GetClosestCollidedPosition(); // modify endpos so that ray gets a cut
			}
			broadcast(JSON.stringify({
					type: 6,
					id: messageinfo.id,
					raylist: messageinfo.raylist
			}));
			clients[messageinfo.id].playerinfo.FireWeapon();
			break;
		case 7:
			if( clients[messageinfo.shooterid] == undefined) return;
			if (projectilelist.length < MAX_PROJECTILE_NUMBER) {
				projectilelist.push(new Projectile(messageinfo.pos, 4, messageinfo.direction, clients[messageinfo.shooterid].playerinfo.team, clients[messageinfo.shooterid].playerinfo, "http://221.159.32.221/w/images/7/7e/UF_Rocket_Red.png", messageinfo.projectiletype));
			}
			clients[messageinfo.id].playerinfo.FireWeapon();
			break;
		case 8: // reserved for building list
			if( clients[messageinfo.id] == undefined) return;
			break;
		case 9: // reserved for building construction
			if( clients[messageinfo.id] == undefined) return;
			break;
		case 10: // reserved for building destruction
			if( clients[messageinfo.id] == undefined) return;
			break;
		case 11: // reserved for heal event
			if( clients[messageinfo.id] == undefined) return;
			break;
		case 12:
			if( clients[messageinfo.id] == undefined) return;
			clients[messageinfo.id].send(JSON.stringify({
				type: 16,
				redteamnum: redteamnum,
				blueteamnum: blueteamnum
			}));
			break;
		case 13: // reload request
			if( clients[messageinfo.id] == undefined) return;
			if (messageinfo.currentweapon == 0) {
				clients[messageinfo.id].playerinfo.secondweapon.ReloadWeapon();
			} else {
				clients[messageinfo.id].playerinfo.firstweapon.ReloadWeapon();
			}
			break;
		case 14:
			if( clients[messageinfo.id] == undefined) return;
			if (messageinfo.version != scriptversion) {
					clients[messageinfo.id].send(JSON.stringify({type:3, message:"게임 버전이 서버와 다릅니다"}));
				}
			break;
		case 15:
			if( clients[messageinfo.id] == undefined) return;
			if (messageinfo.currentweapon == 0) {
				clients[messageinfo.id].playerinfo.secondweapon.DoSpecialSkill();
			} else {
				clients[messageinfo.id].playerinfo.firstweapon.DoSpecialSkill();
			}
			break;
		case 16:
			if( clients[messageinfo.id] == undefined) return;
			clients[messageinfo.id].playerinfo.currentweapon = messageinfo.currentweapon;
			broadcast(JSON.stringify({
				type: 22,
				id: messageinfo.id,
				currentweapon: messageinfo.currentweapon
			}));
			break;
		default:
			console.log("Unknown message detected");
			break;
	}
	return;
}

function deadStateHandler(id) {
	clients[id].playerinfo.isdead = false;
	clients[id].playerinfo.healthpoint = clients[id].playerinfo.maxhealthpoint;
	if (clients[id].playerinfo.team == 1) {
		clients[id].playerinfo.pos = [mapinfo.RedSpawn[0] + 4, mapinfo.RedSpawn[1] + 4];
	} else {
		clients[id].playerinfo.pos = [mapinfo.BlueSpawn[0] + 4, mapinfo.BlueSpawn[1] + 4];
	}
	broadcast(JSON.stringify({
		type:20,
		id: id,
		respawnpos: clients[id].playerinfo.pos
	}));
}

// game designer defined function

function Projectile_Rocket(pos, size, direction, team, shooter, imgsrc) {
	Projectile.call(this, pos, size, direction, team, shooter, imgsrc);
}
Projectile_Rocket.prototype = Object.create(Projectile.prototype);
Projectile_Rocket.prototype.constructor = Projectile_Rocket;

function Weapon (type, owner) {
	this.type = type;
	this.owner = owner;
	this.timerhandler;
	this.loadedbullet = 1;
	this.firedelay = 1000;
	this.reloaddelay = 1000;
	this.isReloading = false;
	this.isFiring = false;
	this.MaxAmmo = this.loadedbullet;
	this.weaponname = "?";
	this.ReloadWeapon = () => {
		this.isFiring = false; 
		if (!this.isReloading && this.loadedbullet != this.MaxAmmo){
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.ReloadWeapon_sub, this.reloaddelay);
			this.isReloading = true;
		}
	};
	this.ReloadWeapon_sub = () => {
		// use fetch to fire event and get result
		// apply the result
			// if result failed(due to timing or else)
			// if result is success
			this.loadedbullet = this.MaxAmmo;
			this.isReloading = false;
		return;
	}
	this.FireWeapon = () =>{
		if (this.type != 9 && this.loadedbullet == 0 && !this.isReloading) {
			this.ReloadWeapon();
		} else if (!this.isReloading && !this.isFiring) {
			// use fetch to fire event and get result
			// apply the result
				// if result failed(due to timing or else)
				// if result is success
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.FireWeapon_sub, this.firedelay);
			this.isFiring = true;
		}
	};
	this.FireWeapon_sub = () => {
		this.isFiring = false;
	};
	this.ReleaseFire = () => {
		return;
	};
	this.DoSpecialSkill = () => {
		// use fetch to fire event and get result
		// apply the result
			// if result failed(due to timing or else)
			// if result is success
	};
}
function Weapon_Pistol (type, owner) {
	Weapon.call(this, type, owner);
	this.loadedbullet = 6;
	this.firedelay = 300;
	this.reloaddelay = 1000;
	this.MaxAmmo = this.loadedbullet;
	this.weaponname = "Pistol";
	this.FireWeapon = () =>{
		if (this.type != 9 && this.loadedbullet == 0 && !this.isReloading) {
			this.ReloadWeapon();
		} else if (!this.isReloading && !this.isFiring) {
			if (this.type != 9 && this.loadedbullet > 0)this.loadedbullet -= 1;
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.FireWeapon_sub, this.firedelay);
			this.isFiring = true;
		}
	};
	this.FireWeapon_sub = () => {
		this.isFiring = false;
	};
	this.ReleaseFire = () => {
		return;
	}
}
Weapon_Pistol.prototype = Object.create(Weapon.prototype);
Weapon_Pistol.prototype.constructor = Weapon_Pistol;

function Weapon_PowerShotgun (type, owner) {
	Weapon.call(this, type, owner);
	this.loadedbullet = 4;
	this.firedelay = 800;
	this.reloaddelay = 1000;
	this.MaxAmmo = this.loadedbullet;
	this.weaponname = "Power Shotgun";
	this.FireWeapon = () =>{
		if (this.type != 9 && this.loadedbullet == 0 && !this.isReloading) {
			this.ReloadWeapon();
		} else if (!this.isReloading && !this.isFiring) {
			if (this.type != 9 && this.loadedbullet > 0)this.loadedbullet -= 1;
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.FireWeapon_sub, this.firedelay);
			this.isFiring = true;
		}
	};
	this.FireWeapon_sub = () => {
		this.isFiring = false;
	};
	this.ReleaseFire = () => {
		return;
	}
}
Weapon_PowerShotgun.prototype = Object.create(Weapon.prototype);
Weapon_PowerShotgun.prototype.constructor = Weapon_PowerShotgun;
function Weapon_Minigun (type, owner) {
	Weapon.call(this, type, owner);
	this.loadedbullet = 200;
	this.firedelay = 100;
	this.reloaddelay = 5000;
	this.MaxAmmo = this.loadedbullet;
	this.weaponname = "Minigun";
	this.FireWeapon = () =>{
		if (this.type != 9 && this.loadedbullet == 0 && !this.isReloading) {
			this.ReloadWeapon();
		} else if (!this.isReloading && !this.isFiring) {
			if (this.type != 9 && this.loadedbullet > 0)this.loadedbullet -= 1;
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.FireWeapon_sub, this.firedelay);
			this.isFiring = true;
		}
	};
	this.FireWeapon_sub = () => {
		this.isFiring = false;
	};
	this.ReleaseFire = () => {
		return;
	}
}
Weapon_Minigun.prototype = Object.create(Weapon.prototype);
Weapon_Minigun.prototype.constructor = Weapon_Minigun;
function Weapon_RocketLauncher (type, owner) {
	Weapon.call(this, type, owner);
	this.loadedbullet = 6;
	this.firedelay = 800;
	this.reloaddelay = 1000;
	this.MaxAmmo = this.loadedbullet;
	this.weaponname = "Rocket Launcher";
	this.FireWeapon = () =>{
		if (this.type != 9 && this.loadedbullet == 0 && !this.isReloading) {
			this.ReloadWeapon();
		} else if (!this.isReloading && !this.isFiring) {
			if (this.type != 9 && this.loadedbullet > 0)this.loadedbullet -= 1;
			clearTimeout(this.timerhandler);
			this.timerhandler = setTimeout(this.FireWeapon_sub, this.firedelay);
			this.isFiring = true;
		}
	};
	this.FireWeapon_sub = () => {
		this.isFiring = false;
	};
	this.ReleaseFire = () => {
		return;
	}
}
Weapon_RocketLauncher.prototype = Object.create(Weapon.prototype);
Weapon_RocketLauncher.prototype.constructor = Weapon_RocketLauncher;

function GetMyNewWeapon(type, player) {
	let newweapon = new Weapon(type,player);
	switch (type) {
		case 0: // pistol
			newweapon = new Weapon_Pistol(type, player);
			break;
		case 1: // nail gun
			newweapon.loadedbullet = 30;
			newweapon.firedelay = 200;
			newweapon.reloaddelay = 1000;
			break;
		case 2: // short shotgun
			newweapon.loadedbullet = 8;
			newweapon.firedelay = 400;
			newweapon.reloaddelay = 2000;
			break;
		case 4: // power shotgun
			newweapon = new Weapon_PowerShotgun(type, player);
			break;
		case 5: // minigun
			newweapon = new Weapon_Minigun (type, player);
			break;
		case 6: // rocket shooter
			newweapon = new Weapon_RocketLauncher (type, player);
			break;
		case 7: // medibeam shooter
			newweapon.loadedbullet = -1;
			newweapon.firedelay = 200;
			newweapon.reloaddelay = 0;
			break;
		case 8: // watershooter
			newweapon.loadedbullet = -1;
			newweapon.firedelay = 200;
			newweapon.reloaddelay = 0;
			break;
		case 9: // wrench
			newweapon.loadedbullet = 200;
			newweapon.firedelay = 800;
			newweapon.reloaddelay = 1000;
			break;
		case 10: // pipe shooter
			newweapon.loadedbullet = 8;
			newweapon.firedelay = 400;
			newweapon.reloaddelay = 2000;
			break;
		case 11: // sniper rifle
			newweapon.loadedbullet = 1;
			newweapon.firedelay = 400;
			newweapon.reloaddelay = 2000;
			break;
		case 12: // knife
			newweapon.loadedbullet = -1;
			newweapon.firedelay = 800;
			newweapon.reloaddelay = 1000;
			break;
		default:
			newweapon.loadedbullet = 1;
			newweapon.firedelay = 400;
			newweapon.reloaddelay = 1000;
			break;
	}
	newweapon.MaxAmmo = newweapon.loadedbullet;
	return newweapon;
}
