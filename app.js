const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

const port = process.env.PORT || 4000;

const http = require("http");
const server = http.createServer(app);

const { Server } = require("socket.io");

const io = new Server(
  server,
  //Permitir conectarse desde cualquier dirección.
  {
    cors: {
      origin: "*",
      credentials: true,
    },
  }
);

//Define Message class

//Define User class

//Define Room class

let messages = [];

let socketsUserNamesAndRooms = [];

//--------------------------------------------------------------------------------------------

io.on("connection", (socket) => {
  console.log("A user has connected: " + socket.id);

  socket.on("joinRoom", (roomNameAndUserName) => {
    console.log(
      "User " +
        roomNameAndUserName.userName +
        " joined room " +
        roomNameAndUserName.roomName
    );

    joinRoom(socket, roomNameAndUserName);
  });

  socket.on("newMessage", (receivedMessage) => {
    //Saves message, user who emits, socket and room where the message has been sent.

    let messageRoomName;

    socketsUserNamesAndRooms.forEach((element) => {
      if (element.socket === socket) {
        messageRoomName = element.roomName;
      }
    });

    receivedMessage.roomName = messageRoomName;

    let messagesToEmit = [];

    messages.push(receivedMessage);

    messages.forEach((message) => {
      if (message.roomName === receivedMessage.roomName) {
        messagesToEmit.push(message);
      }
    });

    io.to(receivedMessage.roomName).emit("messagesUpdated", messagesToEmit);

    console.log(messages);
  });

  socket.on("disconnect", () => {
    //Disconnects user from the Room and removes it from socketIdsUserNamesAndRooms
    //Also updated users for room being leaved.
    let roomBeingLeaved;

    let usersOfLeavedRoom = [];

    let filteredSocketsUserNamesAndRooms = socketsUserNamesAndRooms.filter(
      (element) => {
        if (element.socket.id === socket.id) {
          socket.leave(element.roomName);
          roomBeingLeaved = element.roomName;
        }

        return element.socket.id !== socket.id;
      }
    );

    socketsUserNamesAndRooms = filteredSocketsUserNamesAndRooms;

    //CODIGO REPETIDO EN FUNCION JOIN --> Refactorizar.

    socketsUserNamesAndRooms.forEach((element) => {
      if (element.roomName === roomBeingLeaved) {
        usersOfLeavedRoom.push(element.userName);
      }
    });

    io.to(roomBeingLeaved).emit("usersUpdated", usersOfLeavedRoom);

    console.log("User disconected: " + socket.id);
  });

  //--------------------------------------------------------------------------------------------

  socket.on("requirePrivateChat", (userNameToSpeakWith) => {
    let userSocketToSpeakWith;

    let userNameRequestingPrivateChat;

    socketsUserNamesAndRooms.forEach((user) => {
      if (user.userName === userNameToSpeakWith) {
        userSocketToSpeakWith = user.socket.id;
      } else if (user.socket.id === socket.id) {
        userNameRequestingPrivateChat = user.userName;
      }
    });

    //Conectar a sala privada

    io.to(userSocketToSpeakWith).emit(
      "privateChatRequest",
      userNameRequestingPrivateChat
    );
    console.log(
      "Sending to " +
        userSocketToSpeakWith +
        " chat request from " +
        userNameRequestingPrivateChat
    );
  });

  socket.on("acceptPrivateChat", (userSendingPrivateChatRequest) => {
    let userAcceptingSocket = socket;
    let userAcceptingUserName;

    let userRequestingSocket;
    let userRequestingUserName = userSendingPrivateChatRequest;

    //OK hasta aqui

    socketsUserNamesAndRooms.forEach((element) => {
      if (element.userName === userRequestingUserName) {
        userRequestingSocket = element.socket;
      }

      if (element.socket === userAcceptingSocket) {
        userAcceptingUserName = element.userName;
      }
    });

    let privateRoomName = userRequestingUserName + "&" + userAcceptingUserName;

    let roomNameAndUserNameRequesting = {
      roomName: privateRoomName,
      userName: userRequestingUserName,
    };

    let roomNameAndUserNameAccepting = {
      roomName: privateRoomName,
      userName: userAcceptingUserName,
    };

    //Conectar a sala privada

    joinRoom(userRequestingSocket, roomNameAndUserNameRequesting);

    joinRoom(userAcceptingSocket, roomNameAndUserNameAccepting);

    console.log("Users joining:  " + privateRoomName)
  });
});

//--------------------------------------------------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

server.listen(port, () => {
  console.log("listening on port " + port);
});

//--------------------------------------------------------------------------------------------

function joinRoom(socket, newRoomNameAndUserName) {
  //Removes user from all current rooms
  //Stores the info from user name, socket and room where it is currently listening.
  //Adds user to listen on that room
  //Sends list of users in that room to all users.

  let newRoomName = newRoomNameAndUserName.roomName;
  let userName = newRoomNameAndUserName.userName;

  let roomBeingLeaved;

  currentSocketUserNameAndRoom = {
    socket: socket,
    userName: userName,
    roomName: newRoomName,
  };

  let usersOfNewRoom = [];

  let usersOfOldRoom = [];

  let filteredSocketIdsUserNamesAndRooms = socketsUserNamesAndRooms.filter(
    (element) => {
      if (element.socket.id === socket.id) {
        roomBeingLeaved = element.roomName;
        socket.leave(element.roomName);
      }

      if (element.roomName === newRoomName) {
        usersOfNewRoom.push(element.userName);
      }

      return element.socket.id !== socket.id;
    }
  );

  socketsUserNamesAndRooms = filteredSocketIdsUserNamesAndRooms;

  socketsUserNamesAndRooms.push(currentSocketUserNameAndRoom);

  usersOfNewRoom.push(currentSocketUserNameAndRoom.userName);

  socketsUserNamesAndRooms.forEach((element) => {
    if (element.roomName === roomBeingLeaved) {
      usersOfOldRoom.push(element.userName);
    }
  });

  socket.join(newRoomName);

  messagesToEmit = [];

  messages.forEach((message) => {
    if (message.roomName === newRoomName) {
      messagesToEmit.push(message);
    }
  });

  io.to(newRoomName).emit("messagesUpdated", messagesToEmit);

  io.to(newRoomName).emit("usersUpdated", usersOfNewRoom);

  io.to(newRoomName).emit("roomNameUpdated", newRoomName);

  io.to(roomBeingLeaved).emit("usersUpdated", usersOfOldRoom);
}
