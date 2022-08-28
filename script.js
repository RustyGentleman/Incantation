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
// -------------------------------------------- //
// ?--------- Variables and Constants --------- //
// -------------------------------------------- //

// ?---- Just some useful shorthands, idk ----- //
const abs = Math.abs
const round = Math.round
const random = Math.random
const cos = Math.cos
const sin = Math.sin
const PI = Math.PI
const save = (property, value) => localStorage.setItem(`Incantation.${property}`, value)
const get = (property) => localStorage.getItem(`Incantation.${property}`)
// ?----------- Important variables ----------- //
const SPRINT_MULTIPLIER = 1.5
const PLAYER_SPEED = 0.3
const PLAYER_INTER_RANGE = 7
const PLAYER_ATK = 5
const PLAYER_ATK_RNG = 5
const PLAYER_ATK_COOLDOWN = 300

const ENEMY_SPEED = 0.4
const ENEMY_ATK = 1
const ENEMY_ATK_RANGE = 2
const ENEMY_ATK_COOLDOWN = 1000
const ENEMY_HP = 15

const MAGES = 9
const MAGE_HP = 10

const INCANTATION_CIRCLE_SIZE = 8
const LINE_BREAK_THRESHOLD = 3
const MAX_DEPTH = 15
const SPAWNER_DECINTERVAL = 10000
const SPAWNER_DEC = 100
const SPAWNER_INITIAL = 3000

let has_focus = true
let spawn_enemies = true
let game_over = false
let spawner
let t_game_start
let t_game_m
let t_game_s
let t_game_ms
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
	depth = 0

	constructor(pos) {
		this.id = NodeID++
		this.pos = { x: pos.x, y: pos.y }
		this.element = DrawNode(this.pos)
		this.neighbors = []
		this.depth = 0
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
			.css('--depth', Math.max(node1.depth, node2.depth))
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

	constructor(hp = 100, clss = '') {
		this.id = EntityID++
		this.maxHP = hp
		this.hp = hp
		this.element = $(
			`<div class="entity" data-id="${this.id}">
			<div class="body">
				<div class="hp">
					<div class="hp-bar"></div>
				</div>
			</div>
			<div class="shadow"></div>
			<div class="rangefinder"></div>
		</div>`
		)
		if (clss != '')
			this.element.addClass(clss)
		entities.push(this)
	}

	Remove() {
		entities = entities.filter(function (e) { return e != this })
		this.element.remove()
	}
	SetPos(x, y, skew = false) {
		this.element
			.css('--x', x)
			.css('--y', y)
			.css('--zind', round(y) + 50)
		if (skew) {
			let angle = angle_between(this.pos, { x, y })
			let stride = distance_between(this.pos, { x, y })
			this.SetSkew(-cos(angle) * (stride / PLAYER_SPEED), -sin(angle) * (stride / PLAYER_SPEED), angle * (180 / PI))
		}
		this.pos.x = x
		this.pos.y = y
	}
	GetAttacked(hit, skip_death=false) {
		this.hp -= hit
		this.element.css('--gothit', 1)
		this.element.find('.hp-bar').css('--hp', round(this.hp / this.maxHP * 100) + '%')
		this.element.toggleClass('hit')
		setTimeout(() => this.element.toggleClass('hit'), 100)
		if (skip_death)
			return this.hp
		if (this.hp <= 0)
			this.Die()
	}
	Die() {
		this.element.addClass('dead')
		this.hp = -1
		this.element.animate({ opacity: 0 }, {
			duration: 500,
			complete: () => this.Remove()
		})
	}
	SetSkew(h, v, angle) {
		this.element.find('.body')
			.css('--skew-h', h)
			.css('--skew-v', v)
			.css('--angle', angle)
	}
}
class Enemy extends Entity{
	atk = ENEMY_ATK
	atkRange = ENEMY_ATK_RANGE
	atkCooldownTime = ENEMY_ATK_COOLDOWN
	atkCooldown = false
	speed = ENEMY_SPEED

	constructor() {
		super(ENEMY_HP, 'enemy')
		enemies.push(this)
		if (mages.length == 0)
			this.Die()
	}

	get target() {
		return FindClosest(1000000, mages, this)
	}

	Remove() {
		enemies = enemies.filter((e) => e != this)
		super.Remove()
	}
	Place() {
		$('#enemies').append(this.element)
		let p = place_at_distance({x:0, y:0}, 70)
		this.SetPos(p.x, p.y)
		return this
	}
	Act() {
		this.SetSkew(0, 0, 0)
		if (this.hp <= 0)
			return
		let distance = distance_between(this.pos, this.target.pos)
		let pos = move_towards(this.pos, this.target.pos, this.speed)
		if (distance < this.atkRange)
			this.Attack(this.target)
		else
			this.SetPos(pos.x, pos.y, true)
	}
	Attack() {
		if (this.atkCooldown) return
		if (this.hp <= 0) return
		this.atkCooldown = true
		this.target.GetAttacked(this.atk)
		FlashRangefinder(this.element, this.atkRange)
		setTimeout(() => this.atkCooldown = false, this.atkCooldownTime)
	}
}
class Mage extends Entity{
	constructor() {
		super(MAGE_HP, 'mage')
		mages.push(this)
	}

	Remove() {
		mages = mages.filter((e) => e != this)
		super.Remove()
	}
	GetAttacked(hit) {
		super.GetAttacked(hit, true)
		FlashOverlay('rgb(255 0 0 / 30%)')
		if (this.hp <= 0)
			this.Die()
	}
	Die() {
		this.element.addClass('dead')
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
// ?------------ Runtime variables ------------ //
let mouse = {
	pos: {x:0, y:0},
	inPlayArea: false,
	holdL: false,
	holdR: false,
}

let entities = []
let mages = []
let enemies = []
let EntityID = 0
let NodeID = 0

let player = new Entity()
player.element.attr('id', 'player')
player.atk = PLAYER_ATK
player.isAttacking = false
player.attackCooldown = false
player.movement = {able:true, is:false, left:false, up:false, right:false, down:false, sprint:false}
player.ready = false
// -------------------------------------------- //
// ?------------- The Juicy Stuff ------------- //
// -------------------------------------------- //

// ?------------------ NPCs ------------------- //

// ?-------------- Runtime code --------------- //
$(function(){
	log('Ready')
	UpdateVariables()
	$playarea.prepend(player.element)
	UpdateVariables()
	$('#intro').on('mouseenter', () => mouse.inPlayArea = true)
	$('#intro').on('mouseleave', () => mouse.inPlayArea = false)
	$('*').on('selectstart', () => {return false})
	$(window).on('contextmenu', (e) => e.preventDefault())
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

	// * Animate incantation lines appearing
	setTimeout(() => {
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
		}, 5, $graphics.find('#dust'))
			.css('animation', 'none')
	for (let i=0; i<motes_2_qnt; i++)
		DrawNode({
			x: (INCANTATION_CIRCLE_SIZE - motes_2_dist) * sin(((i * 360 / motes_2_qnt) + 180) * (PI / 180)),
			y: (INCANTATION_CIRCLE_SIZE - motes_2_dist) * cos(((i * 360 / motes_2_qnt) + 180) * (PI / 180))
		}, 5, $graphics.find('#dust'))
			.css('animation', 'none')
	for (let i=0; i<motes_3_qnt; i++)
		DrawNode({
			x: (INCANTATION_CIRCLE_SIZE - motes_3_dist) * sin(((i * 360 / motes_3_qnt) + 180) * (PI / 180)),
			y: (INCANTATION_CIRCLE_SIZE - motes_3_dist) * cos(((i * 360 / motes_3_qnt) + 180) * (PI / 180))
		}, 5, $graphics.find('#dust'))
			.css('animation', 'none')

	// * Start if player is ready
	let start = setInterval(() => {
		if (player.ready) {
			clearInterval(start)
			StartGame()
		}
	}, 100)
	setTimeout(() => {
		$(window).on('keydown', (e) => {
			if (e.which == 80)
				player.ready = true
		})
	}, 7300)
})

// ?------------- Game functions -------------- //
function StartGame() {
	// * Hide readyup text
	$('#readyup').remove()

	// * Hide premise
	$('#premise').css('opacity', 1)
	$('#premise').animate({opacity: 0}, 500)

	// * Hide controls
	if ($controls.css('opacity') > 0)
		$controls.animate({opacity: 0}, 500)

	// * Display starting message
	setTimeout(() => {
		ShowMessage('Enemies will come,\nprotect the cultists.')
		ShowMessage('Be careful where you walk.')
	}, 2000)

	// * Start game loop
	setInterval(GameLoop, 32)

	// * Start timer
	t_game_start = Date.now()

	// * Start enemy spawner

	setTimeout(() => {
		// * Enemy spawn interval
		let spawn_interval = SPAWNER_INITIAL
		let timer = SPAWNER_DECINTERVAL
		spawner = setInterval(() => SpawnEnemies(), SPAWNER_INITIAL)
		// * Spawn interval controller
		setInterval(() => {
			if (document.hidden) return
			if (!spawn_enemies) return
			if (game_over) return
			timer -= 1000
			if (timer <= 0){
				clearInterval(spawner)
				spawn_interval -= SPAWNER_DEC
				timer = SPAWNER_DECINTERVAL
				log('New spawn interval is '+spawn_interval)
				ShowMessage('Swiftly they come...')
				spawner = setInterval(() => SpawnEnemies(), spawn_interval)
			}
		}, 1000)
	}, 3000)
}
function SpawnEnemies(number=1, template={hp:ENEMY_HP, atk:ENEMY_ATK}) {
	if (document.hidden) return
	if (!spawn_enemies) return
	if (game_over) return
	while (number > 0) {
		new Enemy().Place()
		number--
	}
}
function GameLoop() {
	if (game_over) return
	if (!document.hasFocus())
		Object.keys(player.movement).forEach(k => {
			if (k != 'able')
				player.movement[k] = false
		})
	if (document.hidden) return
	if (mages.length == 0) {
		enemies.forEach((e) => e.Die())
		setTimeout(() => {
			$playarea.children().animate({opacity: 0}, {duration: 3000})
		}, 500)
		game_over = true
		let a = 0
		$({a}).animate({a: 1}, {
			duration: 3000,
			step: (now) => $overlay.css('background-color', `rgba(255, 0, 0, ${now})`)
		})
		return
	}
	let time = Date.now() - t_game_start
	$timer.text(`${String(t_game_m=parseInt(time/60000)).padStart(2, '0')}:${String(t_game_s=parseInt(time/1000%60)).padStart(2, '0')}:${String(t_game_ms=parseInt(time%1000)).padStart(3, '0')}`)

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
	DoMovement()
	DoBoundaryCheck()
	DoAttack()
	DoGraphing()
	DoEnemyActions()
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
		let step = PLAYER_SPEED
		step *= (player.movement.sprint || mouse.holdR) ? SPRINT_MULTIPLIER : 1

		let closest_node = FindClosest(100, nodes)
		let distance_check = (closest_node === center) ? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD

		let new_pos = move_towards(player.pos, toward, step)
		let stride = distance_between(player.pos, new_pos)
		if (mouse.holdR) {
			if (player.pos.x == mouse.pos.x && player.pos.y == mouse.pos.y)
				return
			if (stride > distance_between(player.pos, mouse.pos)) {
				player.SetPos(mouse.pos.x, mouse.pos.y, true)
				return
			}
		}
		let new_closest_node = FindClosest(100, nodes, {pos:{x:new_pos.x, y:new_pos.y}})
		if (new_closest_node?.depth <= MAX_DEPTH && distance_between(new_pos, new_closest_node.pos) <= distance_check + stride)
			player.SetPos(new_pos.x, new_pos.y, true)
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
		let targets = FindWithinRange(PLAYER_ATK_RNG, enemies)
		if (!targets) return
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
		FlashRangefinder($player, PLAYER_ATK_RNG)
		player.attackCooldown = true
		setTimeout(() => player.attackCooldown = false, PLAYER_ATK_COOLDOWN)
	}
}
function DoGraphing() {
	if (!player.movement.is && !mouse.holdR)
		return
	let closest_node = FindClosest(100, nodes)
	let distance_check = (closest_node === center) ? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD
	let distance = distance_between(player.pos, closest_node.pos)
	if (distance > distance_check) {
		if (closest_node.depth >= MAX_DEPTH)
			return
		let newnode = new Node(player.pos)
		new Line(closest_node, newnode)
		newnode.depth = closest_node.depth+1
		newnode.element.css('--depth', newnode.depth)
	}
}
function DoEnemyActions() {
	enemies.forEach((e) => e.Act())
}
function FlashRangefinder($entity, range=PLAYER_INTER_RANGE) {
	$entity.find('.rangefinder')
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
	, Math.max(100, rampup))
}
function FindClosest(range=PLAYER_INTER_RANGE, list=entities, start=player) {
	let min = Infinity
	let closest
	list.forEach(inter => {
		let distance = distance_between(start.pos, inter.pos)
		if (distance <= range)
			if (distance < min) {
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
function FindWithinRange(range=PLAYER_INTER_RANGE, list=entities) {
	let targets = []
	list.forEach(inter => {
		let distance = distance_between(player.pos, inter.pos)
		if (distance <= range)
			targets.push(inter)
	})
	return targets
}
function ShowMessage(msg='', options={duration: 4000, stop:false, callback:null}) {
	if (options.stop)
		$msg.stop(false)
	$msg.animate({opacity:1}, {
		duration: 300,
		start: () => $msg.html(msg.replaceAll('\n','<br>'))
	})
		.delay(options.duration)
		.animate({opacity:0}, {
			duration: 300,
			start: () => (options.callback != null)? options.callback() : null
		})
}

// ?------------ Graph functions ------------ //
const UpdateSVG = (svg=$graph) => svg.html(svg.html())
function DrawLine(from, to, appendTo=$graph) {
	let line = $(`<path d="M ${from.x+50} ${from.y+50} L ${to.x+50} ${to.y+50} Z" class="line" vector-effect="non-scaling-stroke"/>`)
	appendTo.append(line)
	UpdateSVG()
	return appendTo.find('path:last-child')
}
function DrawNode(at, radius=5, appendTo=$graphics.find('#nodes')) {
	let node = $(`<node class="entity" style="--r: ${radius};--x: ${at.x};--y: ${at.y};">`).append(`<div class="body hidden" style="background-image: url('assets/mote${round(random()*4)}.png'); transform: rotate(${round(random()*360)}deg);"></div>`)
	appendTo.append(node)
	setTimeout(() => node.find('> .body.hidden').removeClass('hidden'), 50)
	return node
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
	(v * (Math.max(document.documentElement.clientHeight, window.innerHeight || 0))) / 100
const vw = (v) =>
	(v * (Math.max(document.documentElement.clientWidth, window.innerWidth || 0))) / 100
const vmin = (v) =>
	Math.min(vh(v), vw(v))
const distance_between = (pos1, pos2) =>
	Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
const clamp = (num, min, max) =>
	Math.min(Math.max(num, min), max)
const place_at_distance = (center, distance) => {
	let deg = random()*360 * (PI/180)
	return {x: cos(deg)*distance + center.x, y: sin(deg)*distance + center.y}
}
const move_towards = (starting_pos, target_pos, speed) => {
	let distance = distance_between(starting_pos, target_pos)
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