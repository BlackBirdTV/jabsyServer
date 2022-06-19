const net = require('net')
const fs = require('fs')
const readline = require('readline').createInterface({
	input: process.stdin,
	output: process.stdout
});

const port = process.env.PORT || 3001

const serverInfo = JSON.parse(fs.readFileSync('./server.json'))

class User {
	name  = "";
	imageUrl  = "";
	status = "";
	id  = "";

	constructor (name, imageUrl, status, id){
		this.name = name;
		this.imageUrl = imageUrl;
		this.status = status;
		this.id = id;
	}
}

let channels = []
let sockets = []
let users = []

const server = new net.createServer((socket) => {
	if(!sockets.includes(socket)) sockets.push(socket)
	socket.on('end', () => {
		console.log("user left:" + JSON.stringify(users))
		sockets.splice(sockets.indexOf(socket), 1)
		users.forEach((user, i) => { console.log(JSON.stringify(user) == JSON.stringify(socket.user)); if (JSON.stringify(user) == JSON.stringify(socket.user)) users.splice(i, 1); })
		serverInfo.users = users
		sockets.forEach(s => s.write(JSON.stringify(serverInfo)))
	})
	socket.on('error', (e) => {
		console.log(e)
	})
	socket.on('data', (data) => {
		let json = JSON.parse(data)
		let isExistent = false;
		users.forEach(user => { if(user.id == json.id && user.name == json.name && user.status == json.status) isExistent = true })
		if (!isExistent) { users.push(new User(json.name, json.imageUrl, json.status, json.id)); socket.user = new User(json.name, json.imageUrl, json.status, json.id); }
		serverInfo.users = users
		sockets.forEach(s => s.write(JSON.stringify(serverInfo)))
		console.log("user joined: " + JSON.stringify(users))
	})
})
server.listen(port, '127.0.0.1')
console.log(`Server listening on port ${port}`)
serverInfo.channels.forEach((channel) => {
	channels.push(channel.type === 'talk' ? createVoiceChannel(channel.port) : createChannel(channel.port))
	console.log(`Channel "${channel.name}" is running on port ${channel.port}`)
})
cmd()

function cmd(){
	readline.question('', command => {
		console.log(command)
		cmd()
		readline.close();
	});
}

// -------------------- FUNCTIONS --------------------
function createChannel(p) {
	let channelSockets = [];
	const messages = [];

	const server = new net.createServer((socket) => {
		let socketExists = false
		channelSockets.forEach(s => {if (s.remoteAddress == socket.remoteAddress && s.remotePort == socket.remotePort) {socketExists = true; return;} })
		if(!socketExists) channelSockets.push(socket)
		socket.write(JSON.stringify({messages: messages}))
		socket.on('data', (data) => {
			channelSockets.forEach(s => { s.write(data.toString()); console.log(s.remoteAddress) })
			messages.push(JSON.parse(data.toString()))
		})
		socket.on('end', () => {
			let i = 0
			channelSockets.forEach(s => {if (s.remoteAddress == socket.remoteAddress) {return;} i++ })
			channelSockets.splice(i, 1)
		})
		socket.on('error', (e) => {
			console.log(e)
		})
	})
	server.listen(p, '127.0.0.1')
	return server
}

function createVoiceChannel(p) {
	// TODO: code a voice chat server
	createChannel(p)
}
