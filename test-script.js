let nodes = []
let lines = []
let player = {
	pos: {x:0, y:0},
	inPlayArea: false,
	holdL: false,
	holdR: false,
	connectedNode: null,
}
let NodeID = 0
const LINE_BREAK_THRESHOLD = 3
const MAX_DEPTH = 150

$('#playarea').on('mouseenter', () => player.inPlayArea = true)
$('#playarea').on('mouseleave', () => player.inPlayArea = false)
$(document).on('click', () => player.connectedNode = new Node(player.pos))
$(window).on('mousemove', (e) => player.pos = {
	x: (e.clientX-$('#playarea')[0].getBoundingClientRect().x)/vmin(1) - 50,
	y: (e.clientY-$('#playarea')[0].getBoundingClientRect().y)/vmin(1) - 50
})
setInterval(() => DoGraphing(), 16)

class Node {
	id
	pos
	element
	neighbors = []
	depth

	constructor(pos, depth=0) {
		this.id = NodeID++
		this.pos = { x: pos.x, y: pos.y }
		this.element = DrawNode(this.pos).css('--depth', depth)
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
function DoGraphing() {
	let closest_node = FindClosest(100, nodes)
	// let distance_check = (closest_node === center) ? INCANTATION_CIRCLE_SIZE : LINE_BREAK_THRESHOLD
	let distance_check = LINE_BREAK_THRESHOLD
	let d_player_to_connected = distance_between(player.pos, player.connectedNode.pos)
	if (d_player_to_connected > distance_check) {
		if (closest_node != player.connectedNode) {
			if (player.connectedNode.neighbors.includes(closest_node) && distance_between(player.pos, closest_node.pos) <= distance_check) {
					player.connectedNode = closest_node
					return
			}
			else if (distance_between(player.connectedNode, closest_node.pos) <= LINE_BREAK_THRESHOLD*1.5) {
				new Line(player.connectedNode, closest_node)
				player.connectedNode = closest_node
				// GameFail()
				return
			}
			else {
				let closest_to_connected_node = FindClosest(100, nodes.filter(n => (n != player.connectedNode && !player.connectedNode.neighbors.includes(n))))
				if (distance_between(player.connectedNode, closest_to_connected_node) < d_player_to_connected) {
					new Line(player.connectedNode, closest_to_connected_node)
					// player.connectedNode = closest_node
					// GameFail()
					return
				}
			}
		}
		if (player.connectedNode.depth >= MAX_DEPTH)
			return
		let newnode = new Node(player.pos, player.connectedNode.depth+1)
		new Line(player.connectedNode, newnode)
		newnode.depth = player.connectedNode.depth+1
		newnode.element.css('--depth', newnode.depth)
		player.connectedNode = newnode
	}
}
// function DoGraphing() {
// 	mouse.connectedNode
// 	let distance_check = LINE_BREAK_THRESHOLD
// 	let closest_node = FindClosest(100, nodes)
// 	if (distance_between(mouse.pos, mouse.connectedNode.pos) > distance_check) {
// 		if (closest_node != mouse.connectedNode) {
// 			if (mouse.connectedNode.neighbors.includes(closest_node) && distance_between(mouse.pos, closest_node.pos) <= distance_check)
// 					mouse.connectedNode = closest_node
// 			else {
// 				new Line(mouse.connectedNode, closest_node)
// 				mouse.connectedNode = closest_node
// 				// GameFail()
// 			}
// 		}
// 		else {
// 			if (mouse.connectedNode.depth >= MAX_DEPTH)
// 				return
// 			let newnode = new Node(mouse.pos, mouse.connectedNode.depth+1)
// 			new Line(mouse.connectedNode, newnode)
// 			newnode.depth = mouse.connectedNode.depth+1
// 			newnode.element.css('--depth', newnode.depth)
// 			mouse.connectedNode = newnode
// 		}
// 	}
// }
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
function DrawNode(at, radius=5, appendTo=$('#nodes')) {
	let node = $(`<node class="entity" style="--r: ${radius};--x: ${at.x};--y: ${at.y};">`).append(`<div class="body hidden" style="background-image: url('assets/mote${Math.round(Math.random()*4)}.png'); transform: rotate(${Math.round(Math.random()*360)}deg);"></div>`)
	appendTo.append(node)
	setTimeout(() => node.find('> .body.hidden').removeClass('hidden'), 50)
	return node
}