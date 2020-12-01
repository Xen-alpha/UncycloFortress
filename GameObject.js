// GameObject.js by Epic Ungames, 2019-2020

class GameObject {
	constructor (pos, size, direction, team, collidetype, flag, health = 100) { // pos: array[x, y], size: array(cube)[x, y]/integer(cylinder), direction: integer(degree)
		this.pos = pos;
		this.size = size;
		this.rotation = [0, 0 ,0];
		this.direction = direction; // define camera angle
		this.height = 0;
		this.scale = [1, 1, 1];
		this.collidetype = collidetype; // 0: statical cubic(no direction), 1: cylinder
		this.flag = flag; // free flag
		this.team = team; // team : integer(0: not defined, 1: Red Yangachi, 2: Blue Yingeo, 3: Neutral - both team can go through)
		this.state = 0; // state depends on type of Game Object(0 is usually initial state)
		this.healthpoint = health;
		this.maxhealthpoint = health;
		this.canbedamaged = false;
		this.cameraMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
		this.cameraAngleRadians = 0;
	}
	updateCameraAngle (value) {
		this.cameraAngleRadians = degToRad(value);
	 }
	updatePosition (index, value){
		switch (index) {
			case 0:
				this.pos[0] = value;
				break;
			case 2:
				this.pos[1] = value;
				break;
			case 1:
				this.height = value;
				break;
			default:
				break;
		}
	  }
	updateRotation (index, value) {
		var angleInDegrees = value;
		var angleInRadians = (angleInDegree % 360) * Math.PI / 180;
		this.rotation[index] = angleInRadians;
	  }

	updatescale (index, value) {
		  this.scale[index] = value;
	  }
	GetCenterPosition () {
		if (this.collidetype == 0) {
			return [this.pos[0] + this.size[0] /2, this.pos[1] + this.size[1] / 2];
		} else {
			return [this.pos[0] + this.size, this.pos[1] + this.size];
		}
	}
	SetCenterPosition (position) {
		if (this.collidetype == 0) {
			this.pos = [position[0] -this.size[0] /2, position[1] -this.size[1] / 2];
		} else {
			this.pos = [position[0] -this.size, position[1] - this.size];
		}
	}
	IsColliding(target) {
		if (this.collidetype == 0 && target.collidetype == 0) { // cube vs cube
			if (this.GetCenterPosition()[0] + this.size[0]/2 >= target.GetCenterPosition()[0] - target.size[0]/2 && this.GetCenterPosition()[0] - this.size[0]/2 <= target.GetCenterPosition()[0] + target.size[0]/2 && this.GetCenterPosition()[1] + this.size[1]/2 >= target.GetCenterPosition()[1] - target.size[1]/2 && this.GetCenterPosition()[1] - this.size[1]/2 <= target.GetCenterPosition()[1] + target.size[1]/2) return true;
			else return false;
		} else if (this.collidetype == 0 && target.collidetype == 1) {
			if (target.GetCenterPosition()[0] + target.size >= this.GetCenterPosition()[0] - this.size[0] / 2 && target.GetCenterPosition()[0] - target.size <= this.GetCenterPosition()[0] + this.size[0] / 2) { // horizontal collision
				if (target.GetCenterPosition()[1] >= this.GetCenterPosition()[1] - this.size[1]/2 - target.size && target.GetCenterPosition()[1] <= this.GetCenterPosition()[1] + this.size[1]/2 + target.size ) 	return true;
			}
			if (target.GetCenterPosition()[1] + target.size >= this.GetCenterPosition()[1] - this.size[1] /2 && target.GetCenterPosition()[1] - target.size <= this.GetCenterPosition()[1] + this.size[1] /2) {
				// vertical collision
				if (target.GetCenterPosition()[0]+ target.size >= this.GetCenterPosition()[0] - this.size[0]/2 && target.GetCenterPosition()[0] - target.size <= this.GetCenterPosition()[0] + this.size[0] /2) {
					return true;
				}
			}
			// corner collision
			let equation1 = (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0] - this.size[0] / 2)) * (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0]- this.size[0] / 2))+ (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]- this.size[1] / 2)) * (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]- this.size[1] / 2));
			let equation2 = (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0] - this.size[0] / 2)) * (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0]- this.size[0] / 2))+ (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]+this.size[1]/2)) * (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]+this.size[1]/2));
			let equation3 = (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0]+this.size[0]/2)) * (target.GetCenterPosition()[0]-(this.GetCenterPosition()[0]+this.size[0]/2))+ (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]- this.size[1] / 2)) * (target.GetCenterPosition()[1]-(this.GetCenterPosition()[1]- this.size[1] / 2));
			let equation4 = (target.GetCenterPosition()[0]-this.GetCenterPosition()[0]-this.size[0]/2) * (target.GetCenterPosition()[0]-this.GetCenterPosition()[0]-this.size[0]/2)+ (target.GetCenterPosition()[1]-this.GetCenterPosition()[1]-this.size[1]/2) * (target.GetCenterPosition()[1]-this.GetCenterPosition()[1]-this.size[1]/2);
			if (equation1 <= target.size* target.size || equation2 <= target.size* target.size || equation3 <= target.size* target.size || equation4 <= target.size* target.size) {
				return true;
			} else {
				return false;
			}
		} else if (this.collidetype == 1 && target.collidetype == 0) {
			if (this.GetCenterPosition()[0] + this.size >= target.GetCenterPosition()[0] - target.size[0] / 2 && this.GetCenterPosition()[0] - this.size <= target.GetCenterPosition()[0] + target.size[0]/2) { // horizontal collision
				if (this.GetCenterPosition()[1] + this.size>= target.GetCenterPosition()[1] - target.size[1] / 2 && this.GetCenterPosition()[1] - this.size <= target.GetCenterPosition()[1] + target.size[1]/2 ) return true;
			}
			if (this.GetCenterPosition()[1] + this.size >= target.GetCenterPosition()[1] - target.size[1] / 2 && this.GetCenterPosition()[1] - this.size <= target.GetCenterPosition()[1] + target.size[1]/2 ) {
				// vertical collision
				if (this.GetCenterPosition()[0] + this.size>= target.GetCenterPosition()[0] - target.size[0] / 2  && this.GetCenterPosition()[0]- this.size <= target.GetCenterPosition()[0] + target.size[0] /2) {
					return true;
				}
			}
			// corner collision
			let equation1 = (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0]+target.size[0]/2)) * (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0]+target.size[0]/2))+ (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]+target.size[1]/2)) * (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]+target.size[1]/2));
			let equation2 = (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0] - target.size[0] / 2)) * (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0]- target.size[0] / 2))+ (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]+target.size[1]/2)) * (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]+target.size[1]/2));
			let equation3 = (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0]+target.size[0]/2)) * (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0]+target.size[0]/2))+ (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1] - target.size[1] / 2)) * (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1] - target.size[1] / 2));
			let equation4 = (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0] - target.size[0] / 2)) * (this.GetCenterPosition()[0]-(target.GetCenterPosition()[0] - target.size[0] / 2))+ (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]- target.size[1] / 2)) * (this.GetCenterPosition()[1]-(target.GetCenterPosition()[1]- target.size[1] / 2));
			if (equation1 <= this.size* this.size || equation2 <= this.size* this.size || equation3 <= this.size* this.size || equation4 <= this.size* this.size) {
				return true;
			} else {
				return false;
			}
		} else { // cylinder vs cylinder
			if ((this.GetCenterPosition()[0] - target.GetCenterPosition()[0])*(this.GetCenterPosition()[0] - target.GetCenterPosition()[0]) + (this.GetCenterPosition()[1] - target.GetCenterPosition()[1])*(this.GetCenterPosition()[1] - target.GetCenterPosition()[1]) <= (this.size + target.size) * (this.size + target.size)) return true;
			else return false;
		}
		return false; // this could not be happened
	}
}

module.exports = GameObject;