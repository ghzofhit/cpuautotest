var cpu = {};
var open = false;
var get_flash_api = '';
var get_flash_url = "";

var delay = function(data,timeout){
    var promise = new RSVP.Promise(function (resolve, reject) {
        timeout = parseInt(timeout);
        if (timeout != NaN) {
            setTimeout(function () {
                resolve(data);
            }, timeout);
        } else {
            resolve(data);
        }
    });
    return promise;
}

var createTab = function(flash){
    var promise = new RSVP.Promise(function(resolve, reject){
        chrome.tabs.create({url:get_flash_url+flash.id},function(tab){
            open = true;
            resolve({flash:flash,tab:tab});
        });
    });
    return promise;
}

var getJSON = function(url) {
    var promise = new RSVP.Promise(function(resolve, reject){
        var option = {
            url:url,
            type:'get',
            dataType:'json',
            error:function(error){
                reject(error);
            },
            success:function(data){
                if(data.status){
                    if(data.content==''){
                        reject(data.message);
                    }else{
                        resolve(data.content);
                    }
                }else{
                    reject(data.message);
                }
            }
        };
        setTimeout(function(){$.ajax(option);},200);
    });
    return promise;
};

var getCpuInfo = function(vo){
    var promise = new RSVP.Promise(function(resolve, reject){
        open = false;
        chrome.tabs.remove(vo.tab.id);
        var max = 0;
        var average = 0;
        for(pid in cpu ){
            var _max = 0;
            var _total = 0;
            var _count = 0;
            for(used in cpu[pid]){
                if(cpu[pid][used]>0){
                    _max = cpu[pid][used] > _max ? cpu[pid][used]:_max;
                    _count ++;
                    _total += cpu[pid][used];
                }
            }
            if(_count >0 ){
                max = _max > max ? _max :max;
                average = average >(_total/_count) ?  average :  Math.round((_total/_count)*100);
            }
        }
        cpu  = [];
        vo.max = max;
        vo.average = average;
        resolve(vo);
    });
    return promise;
}

window.main = function(){
    getJSON(get_flash_api)
//    .then(function(flash){
//        return getJSON(get_flash_api+"set?id="+flash.id +"&st=1");
//    })
    .then(function(flash){
        return createTab(flash);
    })
    .then(function(tab){
        return delay(tab,16000);
    })
    .then(function(vo){
        return getCpuInfo(vo);
    })
    .then(function(vo){
        return getJSON(get_flash_api+"set?id="+vo.flash.id +"&st=2&hc="+vo.max+"&ac="+vo.average);
    })
    .then(function(){
        setTimeout(function(){window.main()},2000);
    })
    .fail(function(error) {
        setTimeout(function(){window.main()},2000);
    });
}

$(document).ready(function() {
    chrome.processes.onUpdated.addListener(function(processes) {
        if(open){
            for (pid in processes) {
                if(processes[pid].type=='plugin'){
                    if(typeof (cpu[processes[pid].id])=="undefined"){
                        cpu[processes[pid].id] = [];
                    }
                    cpu[processes[pid].id].push(processes[pid].cpu);
                }
            }
        }
    });
    return    window.main();
});
