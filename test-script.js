let nodes = []
let lines = []
let player = {
	pos: {x:0, y:0, changed:true},
	inPlayArea: false,
	holdL: false,
	holdR: false,
	connectedNode: null,
}
let NodeID = 0
const LINE_BREAK_THRESHOLD = 3
const INCANTATION_CIRCLE_SIZE = -1
const MAX_DEPTH = 150
let center

const abs = Math.abs
const round = Math.round
const random = Math.random
const min = Math.min
const max = Math.max
const cos = Math.cos
const sin = Math.sin
const PI = Math.PI
const log = console.log

$('#playarea').on('mouseenter', () => player.inPlayArea = true)
$('#playarea').on('mouseleave', () => player.inPlayArea = false)
$(document).on('click', () => {
	if (nodes.length < 2) return new Node(player.pos)
	if (distance_between(player.pos, FindClosest(100, nodes)?.pos) < 10)
		new Line(FindClosest(100, nodes), nodes[nodes.length-1])
	else {
		let newnode = new Node(player.pos)
		new Line(newnode, FindClosest(100, nodes.filter(n => n != newnode), newnode.pos))
	}
})
$(window).on('mousemove', (e) => player.pos = {
	x: (e.clientX-$('#playarea')[0].getBoundingClientRect().x)/vmin(1) - 50,
	y: (e.clientY-$('#playarea')[0].getBoundingClientRect().y)/vmin(1) - 50,
	changed: true,
})
// setInterval(() => DoGraphing(), 16)

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
function DoGraphing() {
	let DEBUG = false
	if (player.pos.changed == false) return
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
			}, null, $('#nodes'), newnode.depth-0.5, true)
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
				}, null, $('#nodes'), newnode.depth-0.5, true)
				// newnode.depth = player.connectedNode.depth+1
				// newnode.element.css('--depth', newnode.depth)
				player.connectedNode = newnode
				if (DEBUG) log(`Connected player to node ID ${newnode.id}`)
			}
		}
	}
	if (DEBUG) log('#-- DoGraph: End')
	console.groupEnd()
	log(FindCycle())
	player.pos.changed = false
}
function FindClosest(range=100, list=entities, start=player) {
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
	return closest
}

const distance_between = (pos1, pos2) =>
	Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2))
	
const UpdateSVG = (svg=$('#graph')) => svg.html(svg.html())
const vh = (v) =>
	(v * (Math.max(document.documentElement.clientHeight, window.innerHeight || 0))) / 100
const vw = (v) =>
	(v * (Math.max(document.documentElement.clientWidth, window.innerWidth || 0))) / 100
const vmin = (v) =>
	Math.min(vh(v), vw(v))
function DrawLine(from, to, appendTo=$('#graph')) {
	let line = $(`<path d="M ${from.x+50} ${from.y+50} L ${to.x+50} ${to.y+50} Z" class="line" vector-effect="non-scaling-stroke"/>`)
	appendTo.append(line)
	UpdateSVG()
	return appendTo.find('path:last-child')
}
function DrawNode(at, radius='', appendTo=$('#nodes'), depth='', extra=false) {
	let node = $(`<node id data-id ${(extra)? 'class="extra"':''} style="${(radius)?`--r:${radius};`:''}${(depth)?`--depth:${depth};`:''}--rot:${round(random()*360)}deg;--x: ${at.x};--y: ${at.y};background-image: url('assets/sprites/mote${round(random()*4)}.png');">`)
	appendTo.append(node)
	setTimeout(() => node.find('> .body.hidden').removeClass('hidden'), 50)
	return node
}
function FindCycle() {
	let visited = []
	let finished = []
	let line = [nodes[0]]
	return Search(center)

	function Search(node=center) {
		if (finished.includes(center))
			return []
		if (visited.includes(node))
			return [node]
		visited.push(node)
		node.neighbors.forEach((n) => {
			let res = Search(n)
			if (res.length) {
				log(res)
				res.push(node)
				return res
			}
		})
		finished.push(node)
		return []
	}
}