// -------------------------------------------- //
// ?---------------- Preamble ----------------- //
// -------------------------------------------- //

// ?----------- Pretty console logs ----------- //
const logcss = `font-family: 'JetBrains Mono', monospace;text-shadow: 0 0 10px black, 0 0 10px black;background: linear-gradient(to right, #4d94ff 0%, #4d94ff 8px, rgb(77 148 255 / 30%) 8px, transparent 50px);color: #4d94ff;padding: 2px 0 2px 30px;`
const warncss = `font-family: 'JetBrains Mono', monospace;text-shadow: 0 0 10px black, 0 0 10px black;background: linear-gradient(to right, #ffa621 0%, #ffa621 0% 8px, rgb(255 166 33 / 30%) 8px, transparent 50px);color: #ffa621;padding: 2px 0 2px 30px;`
const log = (e) => {
	if (typeof(e) == 'object')
		console.log(e)
	else
		console.log('%c'+e, logcss)
}
const warn = (e) => {
	if (typeof(e) == 'object')
		console.log(e)
	else
		console.log('%c'+e, warncss)
}

// -------------------------------------------- //
// ?--------- Variables and Constants --------- //
// -------------------------------------------- //

// ?---- Just some useful shorthands, idk ----- //
const abs = Math.abs
const round = Math.round
const random = Math.random
const min = Math.min
const max = Math.max
const cos = Math.cos
const sin = Math.sin
const PI = Math.PI
const save = (property, value) => localStorage.setItem(`Incantation.${property}`, value)
const get = (property) => localStorage.getItem(`Incantation.${property}`)
// ?----------- Important variables ----------- //
const SPRINT_MULTIPLIER = 1.5
const PLAYER_SPEED = 0.3
const PLAYER_ATK = 5
const PLAYER_ATK_RNG = 5
const PLAYER_ATK_COOLDOWN = 300
const PLAYER_PICKUP_RANGE = 3

const ENEMY_SPEED = 0.4
const ENEMY_ATK = 1
const ENEMY_ATK_RANGE = 2
const ENEMY_ATK_COOLDOWN = 1000
const ENEMY_HP = 15

const MAGES = 9
const MAGE_HP = 20

const INCANTATION_CIRCLE_SIZE = 8
const LINE_BREAK_THRESHOLD = 4
const MAX_DEPTH = 15
let g_stage = -1
const G_STAGES = [
	{interval: 2000, number: 1, stats: {}, message:'STAGE 1\nStand your ground.\nTread carefully.'},
	{interval: 1500, number: 1, stats: {
			type: 'stronger',
			hp:30,
			speed:0.3,
			atk: 2,
		}, message:'STAGE 2\nDo not rest.\nDo not relent.'
	},
	{interval: 3000, number: 3, stats: {
			type: 'fast',
			hp:10,
			speed:0.6,
			atkCooldownTime:800,
			atkRange: 3,
		}, message:'STAGE 3\nBe swift.\nBe merciless.'
	},
	{interval: 1000, number: 1, stats: {
			type: 'heavy',
			hp:30,
			speed:0.3,
			atk:3,
		}, message:'STAGE 4\nDo not waver.\nDo not falter.'
	},
	{interval: 1500, number: 1, stats: {
			type: 'caster',
			hp:20,
			speed:0.2,
			atkRange:10,
			atk:2,
		}, message:'LAST STAND\nSeek them.\nSmite them.'
	},
]
const possible_powerups = {
	atk: {
		name:'Attack Power',
		bonus:0.5,
	},
	atkRange: {
		name:'Attack Range',
		bonus:0.5,
	},
	atkCooldownTime: {
		name:'Attack Speed',
		bonus:-0.35,
	},
	speed: {
		name:'Movement Speed',
		bonus:0.5,
	},
	heal: {
		name:'Heal Mages',
		bonus:0.3,
	},
}

const TIME_TO_WIN = 5*60*1000

const SOUND_MUTED_DISTANCE = 70
let soundID = 0
let hum = new Howl({
	src: ['assets/sound/hum.ogg'],
	volume: 0,
	loop: true,
	preload: true,
})
let blabber = new Howl({
	src: ['assets/sound/blabber.ogg'],
	volume: 1,
	loop: true,
	preload: true,
})

// ?--------- Quick-access variables ---------- //
let $player
let $playarea
let playarea
let $graphics
let $graph
let $overlay
let $controls
let center
let $msg
let $timer
// ?--------------- Graph stuff --------------- //
let nodes = []
let lines = []
// ?------------- Classes/Objects ------------- //
class Node {
	id
	pos
	element
	neighbors = []
	depth

	constructor(pos, depth=0) {
		this.id = NodeID++
		this.pos = { x: pos.x, y: pos.y }
		this.element = DrawNode(this.pos).css('--depth', depth).attr('data-id', this.id)
		this.neighbors = []
		this.depth = depth
		nodes.push(this)
	}

	SetPos(pos) {
		this.pos.x = pos.x
		this.pos.y = pos.y
		this.element
			.css('--x', pos.x)
			.css('--y', pos.y)
	}
}
class Line {
	ends
	element
	constructor(node1, node2) {
		this.ends = {v:node1, w:node2}
		this.element = DrawLine(node1.pos, node2.pos)
			.css('--depth', max(node1.depth, node2.depth))
		node1.neighbors?.push(node2)
		node2.neighbors?.push(node1)
		lines.push(this)
	}

	get length() {
		return distance_between(this.ends.v.pos, this.ends.w.pos)
	}

	Redraw(node1=this.ends.v, node2=this.ends.w) {
		this.element.attr('d', `M ${node1.pos.x + 50} ${node1.pos.y + 50} L ${node2.pos.x + 50} ${node2.pos.y + 50} Z`)
	}
	Remove() {
		this.element.remove()
		lines = lines.filter((e) => e != this)
	}
}
class Entity {
	id
	pos = {x:0, y:0}
	maxHP
	hp
	element
	speed = PLAYER_SPEED

	constructor(hp = 100, clss = '') {
		this.id = EntityID++
		this.maxHP = hp
		this.hp = hp
		this.element = $(`<div ${clss.includes('lol')?'id="lord-of-lightning"':''} class="entity${(clss!=''&&!clss.includes('lol'))?` ${clss}`:''}" data-entity-id="${this.id}"><div class="body"><div class="hp"><div class="hp-bar"></div></div></div><div class="shadow"></div><div class="rangefinder"></div></div>`)
		entities.push(this)
	}

	Remove() {
		entities = entities.filter(e =>  e != this)
		this.element[0].remove()
	}
	SetPos(x, y, skew = false) {
		this.element
			.css('--x', x)
			.css('--y', y)
			.css('--zind', round(y) + 50)
		if (skew) {
			let angle = angle_between(this.pos, { x, y })
			let stride = distance_between(this.pos, { x, y })
			this.SetSkew(-cos(angle) * (stride / this.speed), -sin(angle) * (stride / this.speed), angle * (180 / PI))
		}
		this.pos.x = x
		this.pos.y = y
		return this
	}
	GetAttacked(hit, skip_death=false, sound=0, pan=true) {
		if (this.hp <= 0) return
		let initial_hp = this.hp
		if (hit < 0)
			this.hp += min(abs(hit), this.maxHP-this.hp)
		else
			this.hp -= hit
		if (initial_hp == this.hp) return
		this.element.css('--gothit', 1)
		this.element.find('.hp-bar').css('--hp', round(this.hp / this.maxHP * 100) + '%')
		this.element.toggleClass('hit')
		setTimeout(() => this.element.toggleClass('hit'), 100)
		if (this.hp >= this.maxHP)
			this.element.css('--gothit', 0)
		if (sound) {
			if (this.hp <= 0) {
				if (pan)
					PlaySound('death-[].ogg', {volume:sound, pan: (this.pos.x-player.pos.x)/(player.atkRange*2)})
				else
					PlaySound('death-[].ogg', {volume:sound})
			}
			else if (pan)
				PlaySound('hit-[].ogg', {volume:sound, pan: (this.pos.x-player.pos.x)/(player.atkRange*2)})
			else
				PlaySound('hit-[].ogg', {volume:sound})
		}
		if (skip_death)
			return this.hp
		if (this.hp <= 0) {
			this.Die()
		}
	}
	Die() {
		this.element.addClass('dead')
		this.hp = -1
		this.element.animate({ opacity: 0 }, {duration: 500})
		setTimeout(() => this.Remove(), 500)
	}
	SetSkew(h, v, angle) {
		this.element.find('.body')
			.css('--skew-h', h)
			.css('--skew-v', v)
			.css('--angle', angle)
	}
}
class Player extends Entity {
	initial_atk = PLAYER_ATK
	initial_atkRange = PLAYER_ATK_RNG
	initial_atkCooldownTime = PLAYER_ATK_COOLDOWN
	atk = PLAYER_ATK
	atkRange = PLAYER_ATK_RNG
	atkCooldownTime = PLAYER_ATK_COOLDOWN
	attackCooldown = false
	isAttacking = false
	movement = {able:true, is:false, left:false, up:false, right:false, down:false, sprint:false}
	initial_speed = PLAYER_SPEED
	speed = PLAYER_SPEED
	ready = false
	connectedNode = null
	stepSoundCooldown = false

	constructor() {
		super(1000, 'player')
		this.element.attr('id', 'player')
	}

	SetPos(x, y, skew = false) {
		super.SetPos(x, y, skew)
		if (!this.stepSoundCooldown) {
			PlaySound('step-[].ogg', {volume:0.1})
			this.stepSoundCooldown = true
			setTimeout(() => this.stepSoundCooldown = false, 75 / (this.speed/2 * ((this.movement.sprint||mouse.holdR)?SPRINT_MULTIPLIER:1)))
		}
		return this
	}
}
class Enemy extends Entity {
	hp = ENEMY_HP
	maxHP = ENEMY_HP
	atk = ENEMY_ATK
	atkRange = ENEMY_ATK_RANGE
	atkCooldownTime = ENEMY_ATK_COOLDOWN
	atkCooldown = false
	speed = ENEMY_SPEED
	timeOfLastAction
	target
	facingWest

	constructor(stats={type:'', hp:ENEMY_HP, atk:ENEMY_ATK, atkRange:ENEMY_ATK_RANGE, atkCooldownTime:ENEMY_ATK_COOLDOWN, speed:ENEMY_SPEED}) {
		if (stats.hp)
			super(stats.hp, `enemy${(stats.type)?` ${stats.type}`:''}`)
		else
			super(ENEMY_HP, `enemy${(stats.type)?` ${stats.type}`:''}`)
		if (stats.atk)
			this.atk = stats.atk
		if (stats.atkRange)
			this.atkRange = stats.atkRange
		if (stats.atkCooldownTime)
			this.atkCooldownTime = stats.atkCooldownTime
		if (stats.speed)
			this.speed = stats.speed
		if (stats.type?.includes('fast'))
			this.element.css('--hue-shift', parseInt(random()*50)-25)
		else
			this.element.css('--hue-shift', parseInt(random()*30)-15)
		enemies.push(this)
		this.Place()
	}

	FindTarget() {
		let attempt
		if (mages.length)
			attempt = FindClosest(1000000, mages, this)
		else
			attempt = FindClosest(1000000, final_targets, this)
		return (this.target = attempt)
	}
	Remove() {
		enemies = enemies.filter((e) => e != this)
		super.Remove()
	}
	Place() {
		$('#enemies').append(this.element)
		let p = place_at_distance({x:0, y:0}, 70)
		this.SetPos(p.x, p.y)
		this.FindTarget()
		return this
	}
	Act() {
		if ((t_game_s*1000+t_game_ms*10) - this.timeOfLastAction < 300)
			return
		if (this.hp <= 0) {
			this.SetSkew(0, 0, 0)
			return
		}
		if (!this.FindTarget()) return
		let pos
		let distance
		if (this.element.hasClass('fast')) {
			pos = move_towards(this.pos, {x: this.target?.pos.x+(this.target?.pos.x>this.pos.x?-2.9:2.9), y:this.target?.pos.y}, this.speed)
			distance = distance_between(this.pos, {x: this.target?.pos.x+(this.target?.pos.x>this.pos.x?-2.9:2.9), y:this.target?.pos.y})
		}
		else {
			pos = move_towards(this.pos, this.target?.pos, this.speed)
			distance = distance_between(this.pos, this.target?.pos)
		}
		if ((this.element.hasClass('fast') && distance == 0) || (!this.element.hasClass('fast') && distance < this.atkRange)) {
			this.element.removeClass('walking')
			this.SetSkew(0, 0, 0)
			this.Attack(this.target)
		}
		else {
			this.SetPos(pos.x, pos.y, true)
			this.element.addClass('walking')
			if (this.target.pos.x - pos.x < 0)
				this.facingWest = true
			else
				this.facingWest = false
			this.element.find('.body, .shadow, .hp')
				.css('animation-duration', 910 * (this.speed*2.5))
				.css('--flip-h', this.facingWest? 1:0)
				// .find('.hp')
				// 	.css('--flip-h', this.facingWest? 1:0)
			if (this.target.pos.y - pos.y < 0)
				this.element.addClass('back')
			else
				this.element.removeClass('back')
		}
		this.timeOfLastAction = t_game_s*1000+t_game_ms*10
	}
	Attack() {
		if (this.atkCooldown) return
		if (this.hp <= 0) return
		this.atkCooldown = true
		setTimeout(() => this.atkCooldown = false, this.atkCooldownTime)
		if (this.element.hasClass('caster')) {
			let p = new Projectile(
				{x: (this.pos.x+(1.2*(this.facingWest? -1:1))), y: this.pos.y-6},
				{x: this.target.pos.x, y: this.target.pos.y-3},
				distance_between(this.pos, this.target.pos) * 10,
				{delayEnd: 1000, callback: () => {
					this.target.GetAttacked(this.atk)
					p.element.addClass('reached-end')
				}}
			)
		}
		else if (this.element.hasClass('fast')) {
			setTimeout(() => this.target.GetAttacked(this.atk), 250)
		}
		else if (this.element.hasClass('heavy')) {
			setTimeout(() => this.target.GetAttacked(this.atk), 250)
		}
		else
			this.target.GetAttacked(this.atk)
		// FlashRangefinder(this.element, this.atkRange)
		this.element.removeClass('attacking')
		this.element.addClass('attacking')
		setTimeout(() => this.element.removeClass('attacking'), 500)
	}
	GetAttacked(hit, soundVolume=1) {
		if (super.GetAttacked(hit, true, soundVolume) <= 0) {
			let delay
			if (this.element.hasClass('caster'))
				delay = 2400
			if (this.element.hasClass('fast'))
				delay = 900
			if (this.element.hasClass('heavy'))
				delay = 1000
			this.Die(delay)
		}
	}
	Die(delay=1900) {
		this.hp = -1
		this.element.addClass('dead')
		setTimeout(() => {
			this.element.animate({opacity:0}, {
				duration: 1000,
				done: () => this.Remove()
			})
		}, delay)
	}
}
class Mage extends Entity {
	constructor() {
		super(MAGE_HP, 'mage')
		mages.push(this)
	}

	Remove() {
		mages = mages.filter((e) => e != this)
		super.Remove()
	}
	GetAttacked(hit, sound=true) {
		let initial_hp = this.hp
		super.GetAttacked(hit, true, false)
		if (this.hp < initial_hp) {
			FlashOverlay('rgb(255 0 0 / 30%)')
			if (sound)
				PlaySound('mage-hit-[].ogg', {distance: distance_between(this.pos, player.pos), pan: (this.pos.x-player.pos.x)/50})
		} else if (this.hp > initial_hp)
			FlashOverlay('rgb(0 255 0 / 50%)', 300)
		if (this.hp <= 0) {
			this.Die()
			if (sound)
				PlaySound('mage-death-[].ogg', {distance: distance_between(this.pos, player.pos), pan: (this.pos.x-player.pos.x)/50})
		}
	}
	Die() {
		this.element.addClass('dying')
		let skewv = 0
		$({skewv}).animate({skewv:10}, {
			duration: 1000,
			step: (now) => this.element.find('.body').css('--skew-v', now)
		})
		this.element.animate({ opacity: 0 }, {
			duration: 1000,
			complete: function () {this.remove()}
		})
		let magelines = $('#circle-lines').children().toArray().filter(p => $(p).attr('data-mage-ids').includes(`${this.id}`))
		let lw = 2
		$({ lw }).animate({ lw: 0 }, {
			duration: 1000,
			start: () => $(magelines).css('animation', 'none'),
			step: (now) => $(magelines).css('stroke-width', `max(${now}px, ${now / 10}vmin)`),
			complete: () => $(magelines).remove()
		})
		FlashOverlay('rgb(255 0 0 / 100%)')
		setTimeout(() => this.Remove(), 1000)
	}
}
class Powerup extends Entity {
	attribute

	constructor(attribute) {
		super(1000, 'powerup')
		this.attribute = attribute

		this.element.addClass(attribute)
		this.element.find('div.hp').remove()
		this.element.find('div.rangefinder').remove()

		powerups.push(this)
		$playarea.append(this.element)
		this.SetPos(0, 0)
	}

	Get() {
		if (this.attribute == 'atkCooldownTime') {
			player[this.attribute] *= 1 + possible_powerups[this.attribute].bonus
			ShowMessage(`${possible_powerups[this.attribute].name} #doubled`, {
				duration: 3000,
				stop: true,
				notice: true,
				blink: true,
			})
		}else if (this.attribute == 'heal') {
			mages.forEach((m) => m.GetAttacked(min(m.maxHP-m.hp, -m.maxHP*possible_powerups[this.attribute].bonus)))
			ShowMessage(`All mages healed by #${parseInt(possible_powerups[this.attribute].bonus*100)}%`, {
				duration: 3000,
				stop: true,
				notice: true,
				blink: true,
			})
		} else {
			player[this.attribute] += player[`initial_${this.attribute}`] * possible_powerups[this.attribute].bonus
			ShowMessage(`${possible_powerups[this.attribute].name} #${((parseInt(possible_powerups[this.attribute].bonus)<0)?'-':'+')}${parseInt(possible_powerups[this.attribute].bonus*100)}%${(player[`${this.attribute}`]/player[`initial_${this.attribute}`]==1+possible_powerups[this.attribute].bonus)?'':`\nCurrent bonus: #${parseInt(player[`${this.attribute}`]/player[`initial_${this.attribute}`]*100)-100}%`}`, {
				duration: 3000,
				stop: true,
				notice: true,
				blink: true,
			})
		}
		PlaySound('powerup-[].ogg')
		powerups = powerups.filter((p) => p != this)
		super.Remove()
	}
}
class Projectile extends Entity {
	from
	to
	travelTime
	delayBegin
	delayEnd

	constructor(from, to, travelTime=100, options={delayBegin: 0, delayEnd: 0, nolaunch:false, callback:null, clss:''}) {
		super(1000, 'projectile')
		this.travelTime = travelTime
		if (options.delayBegin)
			this.delayBegin = options.delayBegin
		if (options.delayEnd)
			this.delayEnd = options.delayEnd
		if (options.callback)
			this.callback = options.callback
		this.element
			.css('--ttime', this.travelTime+'ms')
			.find('.body')
				.css('--angle', angle_between(from, to))
		if (options.clss)
			this.element.addClass(options.clss)
		this.from = from
		this.to = to
		// if (options.nolaunch == undefined || options.nolaunch == false)
		this.Launch()
	}

	async Launch() {
		this.SetPos(this.from.x, this.from.y)
		$playarea.append(this.element)
		await new Promise(r => setTimeout(r, 20))
		await new Promise(r => setTimeout(r, this.delayBegin))
		this.SetPos(this.to.x, this.to.y)
		await new Promise(r => setTimeout(r, this.travelTime))
		if (this.callback)
			this.callback()
		await new Promise(r => setTimeout(r, this.delayEnd))
		this.Remove()
	}
}
class LordOfLightning extends Enemy {
	doneRoaring = false
	facingEast

	constructor() {
		super({type:'lol', hp:1000, atk:1000, atkRange:5, atkCooldownTime:1000, speed:0})
		enemies = enemies.filter((e) => e != this)
		final_targets[1] = this
		FindWithinRange(30, mages).forEach((t) => setTimeout(() => {
			if (t.hp <= 0) return
			let p = new Projectile(
				{x: t.pos.x, y: t.pos.y},
				{x: t.pos.x, y: t.pos.y},
				0,
				{
					delayEnd: 1740,
					callback: () => {
						t.GetAttacked(this.atk, false)
						p.element.addClass('reached-end')
					},
					clss: 'lightning'
				}
			)
			p.element.find('.body').css('--flip-h', `${parseInt(random()*2)}`)
		}, 600))
		this.hp = 1000
		this.maxHP = 1000
		player.element.before(this.element)
		this.SetPos(0,0)
		this.element.addClass('roaring')
		setTimeout(() => {
			this.element.removeClass('roaring')
			this.doneRoaring = true
		}, 1600)
	}

	FindTarget() {
		return (this.target = FindClosest(1000000, enemies.filter((e) => e != this), this))
	}
	Act() {
		if (!this.doneRoaring) return
		if (this.atkCooldown) return
		if ((t_game_s*1000+t_game_ms*10) - this.timeOfLastAction < 300)
			return
		if (!this.FindTarget()) return
		else {
			if (this.pos.x - this.target.pos.x < 0)
				this.facingEast = true
			else
				this.facingEast = false
			this.element.find('.body')
				.css('transform', `translateX(${this.facingEast? '-.8rem':'.8rem'}) translateY(calc(-50% + 1.35rem)) rotateY(calc(var(--flip-h) * 180deg))`)
			this.element.find('.body, .shadow, .hp')
					.css('animation-duration', 910 * (this.speed*2.5))
					.css('--flip-h', this.facingEast? 1:0)
			this.Attack(this.target)
		}
		this.timeOfLastAction = t_game_s*1000+t_game_ms*10
	}
	Attack() {
		if (this.atkCooldown) return
		this.atkCooldown = true
		setTimeout(() => this.atkCooldown = false, this.atkCooldownTime)
		let targets = FindWithinRange(30, enemies, this.target)
		targets.forEach((t) => setTimeout(() => {
			if (t.hp <= 0) return
			let p = new Projectile(
				{x: t.pos.x, y: t.pos.y},
				{x: t.pos.x, y: t.pos.y},
				0,
				{
					delayEnd: 1740,
					callback: () => {
						log(1/targets.length)
						t.GetAttacked(this.atk, false, 1/targets.length, false)
						p.element.addClass('reached-end')
					},
					clss: 'lightning'
				}
			)
			p.element.find('.body').css('--flip-h', `${parseInt(random()*2)}`)
		}, 600))
		// FlashRangefinder(this.element, this.atkRange)
		this.element.removeClass('attacking')
		this.element.addClass('attacking')
		setTimeout(() => this.element.removeClass('attacking'), this.atkCooldownTime-50)
	}
}
// ?------------ Runtime variables ------------ //
let DEBUG = true
let spawn_enemies = true
let game_over = false
let game_paused = false
let game_pause_start
let game_paused_time = 0
let int_game_loop
let int_spawner
let t_game_end
let t_game_m
let t_game_s
let t_game_ms
let debug_widgets = false
let mouse = {
	pos: {x:0, y:0},
	inPlayArea: false,
	holdL: false,
	holdR: false,
}

let entities = []
let mages = []
let enemies = []
let powerups = []
let EntityID = 0
let NodeID = 0

let player = new Player()
let lord
let final_targets = [player, lord]
let final_stand = false
// -------------------------------------------- //
// ?------------- The Juicy Stuff ------------- //
// -------------------------------------------- //

// ?------------------ NPCs ------------------- //

// ?-------------- Runtime code --------------- //
$(function(){
	log('Ready')
	UpdateVariables()
	// * Append player to playarea
	$playarea.prepend(player.element)
	UpdateVariables()
	// * Event listeners
	$('#intro').on('mouseenter', () => mouse.inPlayArea = true)
	$('#intro').on('mouseleave', () => mouse.inPlayArea = false)
	$('*').on('selectstart', () => {return false})
	$($overlay).on('contextmenu', (e) => e.preventDefault())
	$(window).on('mousemove', (e) => mouse.pos = {
		x: (e.clientX-$playarea[0].getBoundingClientRect().x)/vmin(1) - 50,
		y: (e.clientY-$playarea[0].getBoundingClientRect().y)/vmin(1) - 50
	})
	$(window).on('mousedown', (e) => {
		if (e.button == 0) mouse.holdL = true
		if (e.button == 2) mouse.holdR = true
	})
	$(window).on('mouseup', (e) => {
		if (e.button == 0) mouse.holdL = false
		if (e.button == 2) mouse.holdR = false
	})
	$(window).on('keydown', (e) => {
		switch (e.which){
			case 37:
			case 65:
				player.movement.left = true
				break
			case 39:
			case 68:
				player.movement.right = true
				break
			case 38:
			case 87:
				player.movement.up = true
				break
			case 40:
			case 83:
				player.movement.down = true
				break
			case 16:
				player.movement.sprint = true
				break
			case 32:
				player.isAttacking = true
				break
			case 67:
				($controls.css('opacity') >= 0.5) ?
					$controls.stop().animate({opacity: 0}, 500) : $controls.stop().animate({opacity: 1}, 500)
				break
			case 84:
				player.SetPos(mouse.pos.x, mouse.pos.y)
				break
			case 71:
				$(document.body).toggleClass('low-graphics')
				break
			case 78:
				$(document.body).toggleClass('graph-view')
				break
			case 77:
				Howler.volume(Math.abs(Howler.volume()-1))
				break
			case 112:
				e.preventDefault()
				$(document.body).toggleClass('debug-info')
				let widgets = $('.entity div.debug-widget')
				if (widgets.length) {
					widgets.remove()
					debug_widgets = false
				}
				else
					debug_widgets = true
				break
		}
	})
	$(window).on('keyup', (e) => {
		switch (e.which){
			case 37:
			case 65:
				player.movement.left = false
				break
			case 39:
			case 68:
				player.movement.right = false
				break
			case 38:
			case 87:
				player.movement.up = false
				break
			case 40:
			case 83:
				player.movement.down = false
				break
			case 16:
				player.movement.sprint = false
				break
			case 32:
				player.isAttacking = false
				break
		}
	})

	// * Create incantation circle
	center = new Node(player.pos)
	center.element
		.css('--r', INCANTATION_CIRCLE_SIZE)
		.css('--zind', -2)
		[0].id = 'nonagon-infinity'
	player.connectedNode = center
	
	// * Create and place mages
	for (let i=0; i<MAGES; i++){
		let mage = new Mage()
		mage.SetPos(
			(INCANTATION_CIRCLE_SIZE - 0.8) * sin(((-i * 360 / MAGES) + 180) * (PI / 180)),
			(INCANTATION_CIRCLE_SIZE - 0.8) * cos(((-i * 360 / MAGES) + 180) * (PI / 180)),
		)
		$('#mages').append(mage.element)
	}

	// * Create complete graph between mages
	mages.forEach((v, i) => 
		mages.forEach((w, j) => {
			if (v != w && i > j)
				DrawLine(v.pos, w.pos, $graphics.find('#circle-lines'))
					.attr('data-mage-ids', `${w.id} ${v.id}`)
		}))
	$graphics.find('#circle-lines').find('path').addClass('incantation-lines')
	UpdateSVG($graphics.find('#circle-lines'))

	// * Animate incantation lines appearing (+Growl and Hum)
	setTimeout(() => {
		// * Growl:
		PlaySound('activation.ogg')
		let circlelines = $('#circle-lines > path')
		circlelines.each((i, e) => {
			setTimeout(() => {
				let lw = 0
				$({lw}).animate({lw: 2}, {
					duration: 300,
					step: (now) => $(e)
						.css('stroke-width', `${now/10}vmin`),
					complete: () => $(e)
						.css('animation', 'line-throb 1s linear infinite alternate-reverse')
				})
				// * Hum:
				Howler.autoUnlock = true
				if (i == 0) {
					hum.play()
					hum.fade(0, 1, 3000)
				}
			}, 200 + (i*200))
		})
	}, 12000)

	// * Display controls
	setTimeout(() => $controls.animate({opacity: 1}, 500), 20000)
	
	// * Spread dust motes over the circle
	let motes_1_qnt = 15
	let motes_1_dist = 1
	let motes_2_qnt = 9
	let motes_2_dist = 3.5
	let motes_3_qnt = 4
	let motes_3_dist = 6
	for (let i=0; i<motes_1_qnt; i++)
		DrawNode({
			x: (INCANTATION_CIRCLE_SIZE - motes_1_dist) * sin(((i * 360 / motes_1_qnt) + 180) * (PI / 180)),
			y: (INCANTATION_CIRCLE_SIZE - motes_1_dist) * cos(((i * 360 / motes_1_qnt) + 180) * (PI / 180))
		}, '5', $graphics.find('#dust'))
			.css('animation', 'none')
	for (let i=0; i<motes_2_qnt; i++)
		DrawNode({
			x: (INCANTATION_CIRCLE_SIZE - motes_2_dist) * sin(((i * 360 / motes_2_qnt) + 180) * (PI / 180)),
			y: (INCANTATION_CIRCLE_SIZE - motes_2_dist) * cos(((i * 360 / motes_2_qnt) + 180) * (PI / 180))
		}, '5', $graphics.find('#dust'))
			.css('animation', 'none')
	for (let i=0; i<motes_3_qnt; i++)
		DrawNode({
			x: (INCANTATION_CIRCLE_SIZE - motes_3_dist) * sin(((i * 360 / motes_3_qnt) + 180) * (PI / 180)),
			y: (INCANTATION_CIRCLE_SIZE - motes_3_dist) * cos(((i * 360 / motes_3_qnt) + 180) * (PI / 180))
		}, '5', $graphics.find('#dust'))
			.css('animation', 'none')

	// * Start if player is ready
	let start = setInterval(() => {
		if (player.ready) {
			clearInterval(start)
			GameStart()
		}
	}, 100)
	setTimeout(() => {
		$(window).on('keydown', (e) => {
			if (e.which == 80)
				player.ready = true
		})
	}, 7300)

	// * Render debug widgets
	setInterval(() => {
		if (debug_widgets) {
			entities.forEach((e) => {
				if (e.constructor.name == 'Mage') return
				let fields = e.constructor.name+'<br>'
				Object.keys(e).forEach((k) => {
					if (k.includes('initial')) return
					fields += `<span><span>${k}:</span>&nbsp;<span>${
						(typeof(e[k]) == 'object')?
							JSON.stringify(e[k], (key, val) => {
								if (k == 'pos') return JSON.stringify(val).replaceAll('"', '').replaceAll(/\.\d+/g, '')
								if (typeof(val) == 'object') return '{}'
							}).replaceAll('"', '').replaceAll(':',': ')
							: (e[k] === true)? 'yep'
							: (e[k] === false)? 'nah'
							: e[k]
					}</span></span>`
				})
				if (e.element.find('.debug-widget').length)
					e.element.find('.debug-widget').html(fields)
				else
					e.element.append($(`<div class="debug-widget">${fields}</div>`))
			})
		}
	}, 100)
})

// ?------------- Game functions -------------- //
function GameStart() {
	// * Hide readyup text
	$('#readyup').remove()

	// * Hide title and subtitle
	$('#premise')
		.css('opacity', 1)
		.animate({opacity: 0}, 500)
	$('#title-subtitle')
		.css('opacity', 1)
		.animate({opacity: 0}, 500)

	// * Hide controls
	if ($controls.css('opacity') > 0)
		$controls.animate({opacity: 0}, 500)

	// * Start game loop
	int_game_loop = setInterval(GameLoop, 32)

	// * Start timer (powerup spawning inside)
	$timer.css('animation-play-state', 'running')
	t_game_end = Date.now() + TIME_TO_WIN
	$timer.text(`${String(t_game_m=parseInt((TIME_TO_WIN)/60000)).padStart(2, '0')}:${String(t_game_s=parseInt((TIME_TO_WIN)/1000%60)).padStart(2, '0')}`)
	let int_timer = setInterval(() => {
		if (document.hidden) return
		if (game_paused) return
		if (game_over) return clearInterval(int_timer)

		let time = t_game_end - (Date.now() - game_paused_time)
		if (time <= 0) {
			GameEnd('time')
			clearInterval(int_timer)
		}

		// * Every minute elapsed, advance enemy spawning stage and offer a boon
		if (t_game_s == 0 && t_game_m == (G_STAGES.length-1 - g_stage)) {
			g_stage++
			clearInterval(int_spawner)
			int_spawner = setInterval(() => SpawnEnemies(G_STAGES[g_stage].number, G_STAGES[g_stage].stats), G_STAGES[g_stage].interval)
			if (g_stage == 0) {
				ShowMessage(G_STAGES[g_stage].message)
			}
			log('Timer: Advanced game to stage '+g_stage)

			if (t_game_m >= 5) return
			// * Offer to choose a boon
			log('Timer: Pausing game to offer boons')
			game_paused = true
			game_pause_start = Date.now()
			hum.fade(1, 0, 100)

			//- Pick two random boons
			let choices = []
			do {
				let pick = parseInt(random()*Object.keys(possible_powerups).length)
				if (!choices.includes(pick))
					choices.push(pick)
			} while (choices.length < 2)
			choices = [Object.keys(possible_powerups)[choices[0]], Object.keys(possible_powerups)[choices[1]]]
			ShowMessage(`Pick a boon:\n[1] ${possible_powerups[choices[0]].name}\n[2] ${possible_powerups[choices[1]].name}`, {duration: 99999999999, doublestop:true})
			//- Spawn boon and continue game once selected
			$(document.body).one('keydown', (e) => {
				if (e.key == '1') {
					$msg.stop(false)
					ShowMessage(G_STAGES[g_stage].message, {duration:4000})
					new Powerup(choices[0])
					game_paused_time += Date.now() - game_pause_start
					game_paused = false
					hum.fade(0, 1, 100)
					log('Timer: Boon picked')
				}
				if (e.key == '2') {
					$msg.stop(false)
					ShowMessage(G_STAGES[g_stage].message, {duration:4000})
					new Powerup(choices[1])
					game_paused_time += Date.now() - game_pause_start
					game_paused = false
					hum.fade(0, 1, 100)
					log('Timer: Boon picked')
				}
			})

			//- 
		}
		$timer.text(`${String(t_game_m=parseInt(time/60000)).padStart(2, '0')}:${String(t_game_s=parseInt(time/1000%60)).padStart(2, '0')}`)
	}, 250)
}
function GameLoop() {
	if (game_paused) return
	if (game_over) return
	if (document.hidden) return
	if (!document.hasFocus())
		Object.keys(player.movement).forEach(k => (k != 'able') ? player.movement[k] = false : null)
	// * End game
	if (mages.length == 0 && !final_stand)
		GameEnd('mages')

	player.movement.is = (
		(
			player.movement.left
			|| player.movement.up
			|| player.movement.right
			|| player.movement.down
		) || (
			player.controlWithMouse
			&& player.pos.x != mouse.pos.x
			&& player.pos.y != mouse.pos.y
		)
		)
	// * Render player-connectedNode line
	player.line?.remove()
	player.line = DrawLine(player.pos, player.connectedNode.pos)
	if (lord) lord.Act()
	FindWithinRange(PLAYER_PICKUP_RANGE, powerups).forEach((p) => p.Get())
	DoMovement()
	DoBoundaryCheck()
	DoAttack()
	DoGraphing()
	DoEnemyActions()
}
function GameEnd(reason='') {
	log(`GameEnd: ${reason}`)
	if (final_stand) return
	// return

	if (reason == 'time') {
		final_stand = true
		ShowMessage('He has come.')
		lord = new LordOfLightning()
		setTimeout(() => {
			ShowMessage('Your work is done.\nYou are free.', {duration:99999999999999})
		}, 2000)
		setInterval(() => {
			SpawnEnemies(parseInt(random()*5), G_STAGES[parseInt(random()*G_STAGES.length)].stats)
		}, 500)
		return
	}

	game_over = true
	hum.fade(1, 0, 50)
	$controls.stop().animate({opacity: 0}, 300)
	clearInterval(int_game_loop)
	
	// if (reason == 'mages') {
		enemies.forEach((e) => e.Die())
		setTimeout(() => $playarea.children().animate({opacity: 0}, {duration: 3000}), 500)
		let a = 0
		$({a}).animate({a: 1}, {
			duration: 3000,
			step: (now) => $overlay.css('background-color', `rgba(255, 0, 0, ${now})`)
		})
		return
	// }
}
function SpawnEnemies(number=1, stats={type:'', hp:ENEMY_HP, atk:ENEMY_ATK, atkRange:ENEMY_ATK_RANGE, atkCooldownTime:ENEMY_ATK_COOLDOWN, speed:ENEMY_SPEED}) {
	if (document.hidden) return
	if (!spawn_enemies) return
	if (game_paused) return
	if (game_over) return
	while (number > 0) {
		new Enemy(stats)
		--number
	}
}
function UpdateVariables() {
	$player = $('#player')
	$playarea = $('#playarea')
	$graph = $('#graph')
	$graphics = $('#graphics')
	$overlay = $('#overlay')
	$controls = $('#controls')
	$msg = $('#messages')
	$timer = $('#timer')
}
function DoMovement() {
	player.element.find('.body')
		.css('--skew-v', 0)
		.css('--skew-h', 0)
	if (!player.movement.able) return
	if (!player.movement.is && !mouse.holdR) return
	if (mouse.holdR) {
		Move(mouse.pos)
		return
	}

	let tw = {x:player.pos.x, y:player.pos.y}
	tw.x += (player.movement.left) ?	-1 : 0
	tw.x += (player.movement.right) ? 1 : 0
	tw.y += (player.movement.up) ? 	-1 : 0
	tw.y += (player.movement.down) ?	 1 : 0

	Move(tw)

	function Move(toward) {
		let step = player.speed
		step *= (player.movement.sprint || mouse.holdR) ? SPRINT_MULTIPLIER : 1

		let closest_node = FindClosest(100, nodes)
		let distance_check = (closest_node === center) ? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD

		let new_pos = move_towards(player.pos, toward, step)
		let stride = distance_between(player.pos, new_pos)
		if (mouse.holdR) {
			if (player.pos.x == mouse.pos.x && player.pos.y == mouse.pos.y) {
				if (DEBUG) log ('Can\'t move player: Already at mouse position')
				return
			}
			if (stride > distance_between(player.pos, mouse.pos)) {
				player.SetPos(mouse.pos.x, mouse.pos.y, true)
				return
			}
		}
		let new_closest_node = FindClosest(100, nodes, {pos:{x:new_pos.x, y:new_pos.y}})
		if (new_closest_node?.depth <= MAX_DEPTH && distance_between(new_pos, new_closest_node.pos) <= distance_check + stride)
			player.SetPos(new_pos.x, new_pos.y, true)
		else {
			if (!(new_closest_node?.depth <= MAX_DEPTH))
				if (DEBUG) log("Can't move player: Closest node depth is over max")
			if (!(distance_between(new_pos, new_closest_node.pos) <= distance_check + stride))
				if (DEBUG) log("Can't move player: Closest node too far to reach")
		}
	}
	/*
	function Move(dir){
		if (player.movement.able == false) return
		$player.addClass(`moving-${dir}`)
		let step = PLAYER_SPEED
		let diagonal_adjust = 0.7
		if (player.movement.sprint) step *= SPRINT_MULTIPLIER
		let check = {}
		let closest_node = FindClosest(100, nodes)
		let distance_check = (closest_node === center) ? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD
		switch(dir){
			case 'left':
				if ((player.movement.up || player.movement.down) && !(player.movement.up && player.movement.down))
					step *= diagonal_adjust
				if (!MOVE) break
				check = {x: player.pos.x-step, y: player.pos.y}
				closest_node = FindClosest(100, nodes, {pos: check})
				if (closest_node.depth <= MAX_DEPTH
					&& distance_between(check, closest_node.pos) <= distance_check + step)
					$player.css('--x', player.pos.x-=step)
				break
			case 'right':
				if ((player.movement.up || player.movement.down) && !(player.movement.up && player.movement.down))
					step *= diagonal_adjust
				if (!MOVE) break
				check = {x: player.pos.x+step, y: player.pos.y}
				closest_node = FindClosest(100, nodes, {pos: check})
				if (closest_node.depth <= MAX_DEPTH
					&& distance_between(check, closest_node.pos) <= distance_check + step)
					$player.css('--x', player.pos.x+=step)
				break
			case 'up':
				if ((player.movement.left || player.movement.right) && !(player.movement.left && player.movement.right))
					step *= diagonal_adjust
				if (!MOVE) break
				check = {x: player.pos.x, y: player.pos.y-step}
				closest_node = FindClosest(100, nodes, {pos: check})
				if (closest_node.depth <= MAX_DEPTH
					&& distance_between(check, closest_node.pos) <= distance_check + step)
					$player.css('--y', (player.pos.y-=step))
						.css('--zind', round(player.pos.y)+50)
				break
			case 'down':
				if ((player.movement.left || player.movement.right) && !(player.movement.left && player.movement.right))
					step *= diagonal_adjust
				if (!MOVE) break
				check = {x: player.pos.x, y: player.pos.y+step}
				closest_node = FindClosest(100, nodes, {pos: check})
				if (closest_node.depth <= MAX_DEPTH
					&& distance_between(check, closest_node.pos) <= distance_check + step)
					$player.css('--y', (player.pos.y+=step))
						.css('--zind', round(player.pos.y)+50)
				break
		}
	}
	*/
}
function DoBoundaryCheck() {
	if (!(abs(player.pos.x) > 50 || abs(player.pos.y) > 50)) return
	if (abs(player.pos.x) > 50) {
		player.pos.x = clamp(player.pos.x, -50, 50)
		$player.css('--x', player.pos.x)
		$player.removeClass('moving-left moving-right')
	}
	if (abs(player.pos.y) > 50) {
		player.pos.y = clamp(player.pos.y, -50, 50)
		$player.css('--y', player.pos.y)
		$player.removeClass('moving-up moving-down')
	}
}
function DoAttack() {
	if (player.isAttacking || mouse.holdL)
		Attack()

	function Attack() {
		if (player.movement.able == false) return
		if (player.attackCooldown) return
		let targets = FindWithinRange(player.atkRange, enemies)
		if (targets.length == 0) {
			PlaySound('miss-[].ogg', {volume:1})
		}
		targets.forEach((t) => {
			t.GetAttacked(player.atk)
			// let atk_line = new Line(player, t)
			// let strk = 10
			// $({strk}).animate({strk: 2}, {
			// 	duration: 300,
			// 	step: (now) => {
			// 		atk_line.element.css('stroke-width', now+'px')
			// 		atk_line.Redraw(player, t)
			// 	},
			// 	complete: () => atk_line.Remove()
			// })
		})
		FlashRangefinder($player, player.atkRange)
		player.attackCooldown = true
		setTimeout(() => player.attackCooldown = false, player.atkCooldownTime)
	}
}
function DoGraphing() {
	let DEBUG = false
	/*
		Check closest node to player.
	*	If the closest node is the one the player's connected to,
	#		If the player is too far,
				Create a node,
				Connect it to the last node the player was connected to,
				Connect player to the new node.
	#	Else, (if the closest node is NOT the one the player's connected to)
	*		If the player is close enough to the node it's connected to,
	*			If both nodes are neighbors,
					Connect player to the closest node.
	#			If they are not neighbors,
	!				If the distance between the player and the closest node is half of the line break threshold or less,
	!					Connect the nodes,
	-					Connect player to the closest node.
	#		Else, (if the player is too far from the node it's connected to)
	*			If the player is close enough to the closest node,
	-				Connect player to the closest node.
	#			Else, if the player is NOT close enough to the closest node,
	-				Create a node,
	-				Connect it to the last node the player was connected to,
	-				Connect the player to the new node.
	*/
	if (DEBUG) console.group()
	if (DEBUG) log('#-- DoGraph: Start')
	//TODO: Make closest_node the center node if it is within range
	let closest_node
	if (distance_between(player.pos, center.pos) <=INCANTATION_CIRCLE_SIZE)
		closest_node = center
	else
		closest_node = FindClosest(100, nodes)
	let dist_player_to_closest = distance_between(player.pos, closest_node.pos)
	if (closest_node === player.connectedNode) {
		if (DEBUG) log('\tDoGraphing: 1 - Closest node === connected node')
		let dist_check_closest = (closest_node === center)? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD
		if (dist_player_to_closest > dist_check_closest) {
			if (closest_node.depth >= MAX_DEPTH) return
			if (DEBUG) log('\tDoGraphing: 2 - Closest node is too far: ' + dist_check_closest)
			if (DEBUG) log('=== === ===DoGraphing: 2 - Creating new node')
			let newnode = new Node(player.pos, closest_node.depth+1)
			player.line?.remove()
			new Line(closest_node, newnode)
			//# Drop an extra dust mote inbetween:
			DrawNode({
				x: newnode.pos.x+(closest_node.pos.x-newnode.pos.x)/2,
				y: newnode.pos.y+(closest_node.pos.y-newnode.pos.y)/2
			}, null, $graphics.find('#nodes'), newnode.depth-0.5, true)
			// newnode.depth = player.connectedNode.depth+1
			// newnode.element.css('--depth', newnode.depth)
			player.connectedNode = newnode
			if (DEBUG) log(`Connected player to node ID ${newnode.id}`)
		}
	} else {
		if (DEBUG) log('\tDoGraphing: 1 - Closest node !== connected node')
		let dist_player_to_connected = distance_between(player.pos, player.connectedNode.pos)
		let dist_check_connected = (player.connectedNode === center)? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD
		if (dist_player_to_connected <= dist_check_connected) {
			if (DEBUG) log('\tDoGraphing: 2 - Player is close enough to connected node: ' + dist_check_connected)
			if (closest_node.neighbors.includes(player.connectedNode)) {
				if (DEBUG) log('\tDoGraphing: 3 - Nodes are neighbors')
				player.connectedNode = closest_node
				if (DEBUG) log(`Connected player to node ID ${closest_node.id}`)
			} else if (dist_player_to_closest <= ((closest_node === center)? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD/2)) {
				if (DEBUG) log('\tDoGraphing: 3 - Nodes are not neighbors, and closest node is too close')
				player.line?.remove()
				new Line(closest_node, player.connectedNode)
				player.connectedNode = closest_node
				if (DEBUG) log(`Connected player to node ID ${closest_node.id}`)
				GameEnd('cycle')
		}
		} else {
			if (DEBUG) log('\tDoGraphing: 2 - Player is too far from connected node: ' + dist_check_connected)
			if (dist_player_to_closest <= ((closest_node === center)? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD/2)) {
				if (DEBUG) log('\tDoGraphing: 3 - Player is close enough to closest node')
				player.connectedNode = closest_node
			} else {
				if (DEBUG) log('\tDoGraphing: 3 - Player is too far from closest node: ' + ((closest_node === center)? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD/2))
				if (player.connectedNode.depth >= MAX_DEPTH) return
				if (DEBUG) log('\t\tDoGraphing: 3 - Creating new node')
				let newnode = new Node(player.pos, player.connectedNode.depth+1)
				player.line?.remove()
				new Line(player.connectedNode, newnode)
				//# Drop an extra dust mote inbetween:
				DrawNode({
					x: newnode.pos.x+(player.connectedNode.pos.x-newnode.pos.x)/2,
					y: newnode.pos.y+(player.connectedNode.pos.y-newnode.pos.y)/2
				}, null, $graphics.find('#nodes'), newnode.depth-0.5, true)
				// newnode.depth = player.connectedNode.depth+1
				// newnode.element.css('--depth', newnode.depth)
				player.connectedNode = newnode
				if (DEBUG) log(`Connected player to node ID ${newnode.id}`)
			}
		}
	}
	if (DEBUG) log('#-- DoGraph: End')
	console.groupEnd()
}
function DoEnemyActions() {
	enemies.forEach((e) => e.Act())
}
function FlashRangefinder($entity, range=PLAYER_ATK_RNG) {
	$entity.find('.rangefinder')
		.stop(true)
		.css('--radius', range)
		.animate({opacity:1}, {duration:0})
		.animate({opacity:0}, {duration:150})
	// $entity.find('.rangefinder')
	// 	.css('--radius', range)
	// 	.addClass('active')
	// 	.css('opacity', 1)
	// let rot = random()*360
	// setTimeout(() => {
	// 	$entity.find('.rangefinder')
	// 		.css('opacity', 0)
	// 		.removeClass('active')
	// }, 70)
}
function FlashOverlay(color='rgb(255 0 0 / 20%)', rampup=0) {
	$overlay
		.css('transition-duration', `${rampup}ms`)
		.css('background', color)
	setTimeout(() => $overlay
		.css('transition-duration', ``)
		.css('background', '')
	, max(100, rampup))
}
function FindClosest(range=PLAYER_ATK_RNG, list=entities, start=player) {
	let min = Infinity
	let closest
	list.forEach(inter => {
		let distance = distance_between(start.pos, inter.pos)
		if (distance <= range)
			if (distance < min && (inter.hp == undefined || (inter.hp && inter.hp > 0))) {
				closest = inter
				min = distance
			}
	})
	if (list === nodes && start === player) {
		if (distance_between(center.pos, player.pos) < INCANTATION_CIRCLE_SIZE)
			closest = center
	}
	return closest
}
function FindWithinRange(range=PLAYER_ATK_RNG, list=entities, start=player) {
	let targets = []
	list.forEach(inter => {
		let distance = distance_between(start.pos, inter.pos)
		if (distance <= range)
			targets.push(inter)
	})
	return targets
}
function ShowMessage(msg='', options={duration:3000, stop:false, doublestop:false, callback:null, notice:false, blink:false}) {
	options.duration += msg.length * 64
	let target = $msg
	if (options.notice)
		target = $('#notices')
	if (options.stop)
		target.stop(false)
	if (options.doublestop)
		target.stop(true)
	target.html('')
	target
		.animate({opacity:1}, {
			duration: 300,
			start: () => {
				if (options.notice) null
				else
					blabber.play()
				let char = 1
				let reveal = setInterval(() => {
					if (msg[char] == '\\' && msg[char+1] && msg[char+1] == 'n')
						char++
					target.html(msg.slice(0, char).replaceAll('\n', '<br>').replace('#', '<span class="bonus">').replace('#', '</span>'))
					if (char == msg.length) {
						if (options.notice) null
						else
						blabber.stop()
						clearInterval(reveal)
					}
					char++
				}, 64)
			},
			done: () => {
				if (options.blink)
					target.css('animation', '')
						.css('animation', 'reveal .2s ease 7 alternate forwards')
				},
		})
		.delay(options.duration)
		.animate({opacity:0}, {
			duration: 300,
			start: () => {
				if (options.blink) {
					target.css('animation', '')
				}
				if (options.callback)
					options.callback()
			}
		})
}
function PlaySound(filename, options={shuffleQuantity:4, volume:1.0, distance:0, cooldown:300, pan:0}) {
	// let src = `assets/sound/${filename.replace('[]', parseInt(random() * ((options.shuffleQuantity==undefined)?4:options.shuffleQuantity)) + 1)}`
	Howler.autoUnlock = true
	if (options.shuffleQuantity==undefined)
		options.shuffleQuantity = 4
	if (options.volume==undefined)
		options.volume = 1
	if (options.distance==undefined)
		options.distance = 0
	if (options.cooldown==undefined)
		options.cooldown = 300
	if (options.pan==undefined)
		options.pan = 0
	let src = `assets/sound/${filename.replace('[]', soundID++%((options.shuffleQuantity==undefined)?4:options.shuffleQuantity)+1)}`
	let sound = new Howl({
		src: [src],
		volume: max(0, options.volume - (options.distance/SOUND_MUTED_DISTANCE)/2),
		stereo: clamp(options.pan, -1, 1),
		onplay: () => {
			cooldown = true
			setTimeout(() => cooldown = false, (options.cooldown==undefined)?300:options.cooldown)
		},
	})
	sound.play()
}

// ?------------ Graph functions ------------ //
const UpdateSVG = (svg=$graph) => svg.html(svg.html())
function DrawLine(from, to, appendTo=$graph) {
	let line = $(`<path d="M ${from.x+50} ${from.y+50} L ${to.x+50} ${to.y+50} Z" class="line" vector-effect="non-scaling-stroke"/>`)
	appendTo.append(line)
	UpdateSVG()
	return appendTo.find('path:last-child')
}
function DrawNode(at, radius='', appendTo=$graphics.find('#nodes'), depth='', extra=false) {
	let node = $(`<node id data-id ${(extra)? 'class="extra"':''} style="${(radius)?`--r:${radius};`:''}${(depth)?`--depth:${depth};`:''}--rot:${round(random()*360)}deg;--x: ${at.x};--y: ${at.y};background-image: url('assets/sprites/mote${round(random()*4)}.png');">`)
	appendTo.append(node)
	setTimeout(() => node.find('> .body.hidden').removeClass('hidden'), 50)
	return node
}
function FindCycle() {
	let visited = []
	let finished = []
	let line = [center]
	return Search(center)

	function Search(node=center) {
		if (finished.includes(center))
			return
		if (visited.includes(node))
			return node
		visited.push(node)
		node.neighbors.forEach((n) => {
			let res = Search(n)
			if (res) {
				res.push(node)
				return res
			}
		})
		finished.push(node)
		return []
	}
}

// ?----------- Generator functions ----------- //
function chaos_hash(inx, iny, offset=0){
	let seed = 3332 + offset
	let outx = seed + inx * 374761393
	let outy = seed + iny * 668265263
	outx = (outx^(outx >> 13)) * 1274126177
	outy = (outy^(outy >> 29)) * 1274126177
	return {x:outx^(outx >> 7), y:outy^(outy >> 11)}
}

// ?----------- Assistive functions ----------- //
const vh = (v) =>
	(v * (max(document.documentElement.clientHeight, window.innerHeight || 0))) / 100
const vw = (v) =>
	(v * (max(document.documentElement.clientWidth, window.innerWidth || 0))) / 100
const vmin = (v) =>
	min(vh(v), vw(v))
const distance_between = (pos1, pos2) =>
	Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
const clamp = (num, mn, mx) =>
	min(max(num, mn), mx)
const place_at_distance = (center, distance) => {
	let deg = random()*360 * (PI/180)
	return {x: cos(deg)*distance + center.x, y: sin(deg)*distance + center.y}
}
const move_towards = (starting_pos, target_pos, speed) => {
	let distance = distance_between(starting_pos, target_pos)
	if (distance <= speed)
		return target_pos
	if (distance == 0)
		return 0
	let ret = {
		x: starting_pos.x - ((starting_pos.x - target_pos.x) / distance * speed),
		y: starting_pos.y - ((starting_pos.y - target_pos.y) / distance * speed)
	}
	return ret
}
const angle_between = (pos1, pos2) =>
	Math.atan2(pos1.y - pos2.y, pos1.x - pos2.x)
// -------------------------------------------- //