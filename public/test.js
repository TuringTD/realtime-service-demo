// 请将 AppId 改为你自己的 AppId，否则无法本地测试
var appId = '9sVRh5ba30yYedxYQky7VFMc';
var appKey = '2Qp9WaPoDJe9DVwvxgH4hjzq';

AV.initialize(appId, appKey);
AV.setProduction(0);

var clientId = 'service';
var roomId = '';

// 用来存储 realtimeObject
var rt;

// 用来存储创建好的 roomObject
var room;

// 监听是否服务器连接成功
var firstFlag = true;

// 用来标记历史消息获取状态
var logFlag = false;

// 拉取历史相关
// 最早一条消息的时间戳
var msgTime;

// 用来标记当前角色，0 是普通用户，1 是客服
var role = 0;

bindEvent(openCustomerBtn, 'click', openCustomer);
bindEvent(openServiceBtn, 'click', openService);
bindEvent(serviceOpenBtn, 'click', main);
bindEvent(sendBtn, 'click', sendMsg);
bindEvent(closeBtn, 'click', close);
bindEvent(customerOpenBtn, 'click', function() {
  getRoom().then(function(data) {
    roomId = data.convId;
    clientId = data.customId;
    main();
  }, function(err) {
    alert('没有空闲的客服人员，请稍后再试。');
  });
});

bindEvent(document.body, 'keydown', function(e) {
  if (e.keyCode === 13) {
    if (firstFlag) {
      main();
    } else {
      sendMsg();
    }
  }
});

function getRoom() {
  return AV.Cloud.run('start-conv', {
    question: 'same question'
  });
}

function main() {
  showWall.style.display = 'block';
  var val = inputName.value;
  if (role && val) {
    clientId = val;
  }
  if (!firstFlag) {
    rt.close();
  }

  // 创建实时通信实例
  rt = AV.realtime({
    appId: appId,
    clientId: clientId,

    // 请注意，这里关闭 secure 完全是为了 Demo 兼容范围更大些
    // 具体请参考实时通信文档中的「其他兼容问题」部分
    // 如果真正使用在生产环境，建议不要关闭 secure，具体阅读文档
    // secure 设置为 true 是开启
    secure: false
  });

  // 监听连接成功事件
  rt.on('open', function() {
    firstFlag = false;
    showLog('服务器连接成功！');
    switch (role) {
      case 0:
        showLog('你当前的角色是普通用户，系统正在链接服务器，匹配客服，请等待。。。');
        joinRoom();
        customerInput.style.display = 'none';
      break;
      case 1:
        showLog('你当前的角色是客服，请等待客户连接。。。');
        rt.on('join', function(data) {
          if (!roomId) {
            roomId = data.cid;
            joinRoom();
          }
        });
      break;
    }

    // 有一方退出
    rt.on('left', function(data) {
      alert('对方已经结束会话。');
      close();
    });
  });

  // 监听服务情况
  rt.on('reuse', function() {
    showLog('服务器正在重连，请耐心等待。。。');
  });

  // 监听错误
  rt.on('error', function() {
    showLog('连接遇到错误。。。');
  });
}

function joinRoom(callback) {
  // 获得已有房间的实例
  rt.room(roomId, function(object) {

    // 判断服务器端是否存在这个 room，如果存在
    if (object) {
      room = object;

      // 当前用户加入这个房间
      room.join(function() {

        // 获取成员列表
        room.list(function(data) {
          showLog('当前 Conversation 的成员列表：', data);

          // 获取聊天历史
          getLog(function() {
            printWall.scrollTop = printWall.scrollHeight;
            showLog('已经加入，可以开始聊天。');

            // 发送默认的信息
            if (role === 1) {
              sendMsg('你好，我是客服，有什么可以帮您？');
            }

          });
        });

      });

      // 房间接受消息
      room.receive(function(data) {
        if (!msgTime) {
          // 存储下最早的一个消息时间戳
          msgTime = data.timestamp;
        }
        showMsg(data);
      });
    }

    if (callback) {
      callback();
    }
  });
}

// 拉取历史
bindEvent(printWall, 'scroll', function(e) {
  if (printWall.scrollTop < 20) {
    getLog();
  }
});

function openCustomer() {
  startBtns.style.display = 'none';
  realtimeUi.style.display = 'block';
  tips.style.display = 'block';
  roleTipCustomer.style.display = 'inline-block';
  customerInput.style.display = 'block';
  role = 0;
}

function openService() {
  startBtns.style.display = 'none';
  realtimeUi.style.display = 'block';
  tips.style.display = 'block';
  roleTipService.style.display = 'inline-block';
  serviceInput.style.display = 'block';
  role = 1;
}

function close() {
  if (room) {
    room.leave();
  }
  window.location.reload();
}

