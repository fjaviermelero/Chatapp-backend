const express = require('express');
const app = express();
const port = 3000;

const http = require('http');
const server = http.createServer(app)

const {Server} = require('socket.io');
const io = new Server(server);

//Define Message class

//Define User class

//Define Room class

let messages = [];

let socketsUserNamesAndRooms = [];

//--------------------------------------------------------------------------------------------

io.on('connection', (socket)=>{

    console.log('A user has connected: ' + socket.id);

    socket.on('joinRoom', (roomNameAndUserName) => {  

        joinRoom(socket, roomNameAndUserName);

    });

    socket.on('newMessage', (receivedMessage) => {
        //Saves message, user who emits, socket and room where the message has been sent.

        let messageRoomName;

        socketsUserNamesAndRooms.forEach((element)=>{

            if (element.socket === socket){
                messageRoomName = element.roomName;
            }
        })

        //¿¿OK??

        receivedMessage.roomName = messageRoomName;

        let messagesToEmit = [];

        messages.push(receivedMessage);

        messages.forEach((message) => {
            if (message.roomName === receivedMessage.roomName){
                messagesToEmit.push(message);
            }
        })
        
        io.to(receivedMessage.roomName).emit('messagesUpdated', messagesToEmit);

        console.log(messages);
    })

    socket.on('disconnect',()=>{
        //Disconnects user from the Room and removes it from socketIdsUserNamesAndRooms 

        let filteredSocketsUserNamesAndRooms = socketsUserNamesAndRooms.filter((element)=>{

            if (element.socket.id === socket.id) {
                socket.leave(element.roomName)
            }

            return element.socket.id !== socket.id;
        }
        );

        socketsUserNamesAndRooms = filteredSocketsUserNamesAndRooms;

        console.log("User disconected: " + socket.id);
    })


//--------------------------------------------------------------------------------------------

    socket.on("requirePrivateChat", (userNameToSpeakWith)=>{

        let userSocketToSpeakWith;

        let userNameRequestingPrivateChat;

        socketsUserNamesAndRooms.forEach( (user) => {

            if (user.userName === userNameToSpeakWith){

                userSocketToSpeakWith = user.socket.id;

            } else if (user.socket.id === socket.id){

                userNameRequestingPrivateChat = user.userName;

            }

        });

        //Conectar a sala privada

        io.to(userSocketToSpeakWith).emit('privateChatRequest', userNameRequestingPrivateChat);
        console.log("Sending to " + userSocketToSpeakWith + " chat request from " + userNameRequestingPrivateChat) 
    })

    socket.on("acceptPrivateChat", (userSendingPrivateChatRequest) => {

        let userAcceptingSocket = socket;
        let userAcceptingUserName;

        let userRequestingSocket;
        let userRequestingUserName = userSendingPrivateChatRequest;

        socketsUserNamesAndRooms.forEach((element)=>{
            if (element.userName === userRequestingUserName) {
                userRequestingSocket = element.socket;  
            } 

            if (element.socket === userAcceptingSocket) {
                userAcceptingUserName = element.userName;
            }

        })
        
        let privateRoomName = userRequestingUserName + "&" + userAcceptingUserName;

        let roomNameAndUserNameRequesting = {
            "roomName": privateRoomName,
            "userName": userRequestingSocket
        }

        let roomNameAndUserNameAccepting = {
            "roomName": privateRoomName,
            "userName": userAcceptingUserName
        }

        //Conectar a sala privada

        joinRoom(userRequestingSocket, roomNameAndUserNameRequesting);

        joinRoom(userAcceptingSocket, roomNameAndUserNameAccepting);     

    });
})

//--------------------------------------------------------------------------------------------
  
app.get('/', (req,res) => {

    res.sendFile(__dirname + '/client/index.html');

})

server.listen(port, ()=>{
    console.log("listening on port " + port);
})

//--------------------------------------------------------------------------------------------
  
function joinRoom(socket, roomNameAndUserName) {

    //Removes user from all current rooms
    //Stores the info from user name, socket and room where it is currently listening.
    //Adds user to listen on that room

    let roomName = roomNameAndUserName.roomName;
    let userName = roomNameAndUserName.userName;
    
    currentSocketUserNameAndRoom = {
        "socket": socket,
        "userName": userName,
        "roomName": roomName
    };

    let filteredSocketIdsUserNamesAndRooms = socketsUserNamesAndRooms.filter((element)=>{

        if (element.socket.id === socket.id) {
            socket.leave(element.roomName)
        }

        return element.socket.id !== socket.id;
    }
    );

    socketsUserNamesAndRooms = filteredSocketIdsUserNamesAndRooms;

    socketsUserNamesAndRooms.push(currentSocketUserNameAndRoom);

    socket.join(roomName);

    messagesToEmit = [];

    messages.forEach((message) => {
        if (message.roomName === roomName){
            messagesToEmit.push(message);
        }
    })

    io.to(roomName).emit('messagesUpdated', messagesToEmit);

}