/**
 *
 *      ioBroker hs100 Adapter
 *
 *      (c) 2014-2017 arteck <arteck@outlook.com>
 *
 *      MIT License
 *
 */

'use strict';
const utils   = require(__dirname + '/lib/utils'); // Get common adapter utils
const Client = require('./lib/tplink-smarthome-api/lib/index').Client;
const client = new Client();

var result;
var err;
var host  = '';
var plug;
var ip;
var timer     = null;
var stopTimer = null;
var isStopping = false;


var adapter = new utils.Adapter({
    name: 'hs100',
    ready: function () {
        main();
    }
});

adapter.on('unload', function () {
    if (timer) {
        clearInterval(timer);
        timer = 0;
    }
    isStopping = true;
});

function stop() {
    if (stopTimer) clearTimeout(stopTimer);

    // Stop only if schedule mode
    if (adapter.common && adapter.common.mode == 'schedule') {
        stopTimer = setTimeout(function () {
            stopTimer = null;
            if (timer) clearInterval(timer);
            isStopping = true;
            adapter.stop();
        }, 30000);
    }
}

adapter.on('objectChange', function (id, obj) {
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});


adapter.on('stateChange', function (id, state) {
    var tmp = id.split('.');
    var dp  = tmp.pop();
    var idx = tmp.pop();

    ip = idx.replace(/[_\s]+/g, '.');

    // create new plug with selected ip
    const plug = client.getDevice({host: ip}).then((device)=>{
        if (state && !state.ack) {
            if (dp == 'state') {
                device.setPowerState(state.val);
            }
        }
    });
});

process.on('SIGINT', function () {
    if (timer) clearTimeout(timer);
});


function createState(name, ip, callback) {
    var hs_sw_ver;
    var hs_hw_ver;
    var hs_model;
    var hs_mac;
    var hs_sysinfo;

// plug HS110
    var hs_current;
    var hs_power;
    var hs_voltage;
    var hs_total;
    var hs_ip;
    var hs_state;

    var id = ip.replace(/[.\s]+/g, '_');

    client.getDevice({host: ip}).then((result) => {
        if (result) {
            hs_model = result.model;
            hs_state = result.sysInfo.relay_state;

            if (hs_state == 0) {
                hs_state = false;
            } else {
                hs_state = true;
            }

            adapter.createState('', id, 'last_update', {
                name: name || ip,
                def: -1,
                type: 'string',
                read: 'true',
                write: 'true',
                role: 'value',
                desc: 'last update'
            }, {
                ip: ip
            }, callback);

            adapter.createState('', id, 'state', {
                name: name || ip,
                def: hs_state,
                type: 'boolean',
                read: 'true',
                write: 'true',
                role: 'switch',
                desc: 'Switch on/off'
            }, {
                ip: ip
            }, callback);

            adapter.createState('', id, 'mac', {
                name: name || ip,
                def: result.mac,
                type: 'string',
                read: 'true',
                write: 'true',
                role: 'value',
                desc: 'Mac address'
            }, {
                ip: ip
            }, callback);

            adapter.createState('', id, 'sw_ver', {
                name: name || ip,
                def: result.softwareVersion,
                type: 'string',
                read: 'true',
                write: 'true',
                role: 'value',
                desc: 'sw_ver'
            }, {
                ip: ip
            }, callback);

            adapter.createState('', id, 'hw_ver', {
                name: name || ip,
                def: result.hardwareVersion,
                type: 'string',
                read: 'true',
                write: 'true',
                role: 'value',
                desc: 'hw_ver'
            }, {
                ip: ip
            }, callback);

            adapter.createState('', id, 'model', {
                name: name || ip,
                def: hs_model,
                type: 'string',
                read: 'true',
                write: 'true',
                role: 'value',
                desc: 'model'
            }, {
                ip: ip
            }, callback);

            // plug HS110
            if (hs_model.indexOf('110') > 1) {
                adapter.createState('', id, 'current', {
                    name: name || ip,
                    def: 0,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'current'
                }, {
                    ip: ip
                }, callback);
                adapter.createState('', id, 'power', {
                    name: name || ip,
                    def: 0,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'power'
                }, {
                    ip: ip
                }, callback);
				adapter.createState('', id, 'voltage', {
                    name: name || ip,
                    def: 0,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'voltage'
                }, {
                    ip: ip
                }, callback);
                adapter.createState('', id, 'totalNow', {
                    name: name || ip,
                    def: 0,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'totalNow'
                }, {
                    ip: ip
                }, callback);
                adapter.createState('', id, 'totalMonthNow', {
                    name: name || ip,
                    def: 0,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'totalMonthNow'
                }, {
                    ip: ip
                }, callback);
            }
            if (hs_model.indexOf('LB') > 1) {
                adapter.createState('', id, 'brightness', {
                    name: name || ip,
                    def: 100,
                    type: 'string',
                    read: 'true',
                    write: 'true',
                    role: 'value',
                    desc: 'brightness'
                }, {
                    ip: ip
                }, callback);
            }
        }
    });
    adapter.log.debug(hs_model + ' generated ' + ip);
}

function addState(name, ip, callback) {
    adapter.getObject(host, function (err, obj) {
        createState(name, ip, callback);
    });
}

function syncConfig(callback) {
    adapter.getStatesOf('', host, function (err, _states) {
        var configToDelete = [];
        var configToAdd    = [];
        var k;
        var id;
        if (adapter.config.devices) {
            for (k = 0; k < adapter.config.devices.length; k++) {
                configToAdd.push(adapter.config.devices[k].ip);
            }
        }

        var tasks = [];

        if (_states) {
            for (var j = 0; j < _states.length; j++) {
                var ip = _states[j].native.ip;
                if (!ip) {
                    adapter.log.warn('No IP address found for ' + JSON.stringify(_states[j]));
                    continue;
                }
                id = ip.replace(/[.\s]+/g, '_');
                var pos = configToAdd.indexOf(ip);
                if (pos != -1) {
                    configToAdd.splice(pos, 1);
                    for (var u = 0; u < adapter.config.devices.length; u++) {
                        if (adapter.config.devices[u].ip == ip) {
                            if (_states[j].common.name !== (adapter.config.devices[u].name || adapter.config.devices[u].ip)) {
                                tasks.push({
                                    type: 'extendObject',
                                    id:   _states[j]._id,
                                    data: {common: {name: (adapter.config.devices[u].name || adapter.config.devices[u].ip), read: true, write: false}}
                                });
                            } else if (typeof _states[j].common.read !== 'boolean') {
                                tasks.push({
                                    type: 'extendObject',
                                    id:   _states[j]._id,
                                    data: {common: {read: true, write: false}}
                                });
                            }
                        }
                    }
                } else {
                    configToDelete.push(ip);
                }
            }
        }

        if (configToDelete.length) {
            for (var e = 0; e < configToDelete.length; e++) {
                id = configToDelete[e].replace(/[.\s]+/g, '_');
                tasks.push({
                    type: 'deleteState',
                    id:   id
                });
            }
        }

        processTasks(tasks, function () {
            var count = 0;
            if (configToAdd.length) {
                for (var r = 0; r < adapter.config.devices.length; r++) {
                    if (configToAdd.indexOf(adapter.config.devices[r].ip) !== -1) {
                        count++;
                        addState(adapter.config.devices[r].name, adapter.config.devices[r].ip, function () {
                            if (!--count && callback) {
                                callback();
                            }
                        });
                    }
                }
            }
            if (!count && callback) callback();
        });
    });
}

function processTasks(tasks, callback) {
    if (!tasks || !tasks.length) {
        callback && callback();
    } else {
        var task = tasks.shift();
        var timeout = setTimeout(function () {
            adapter.log.warn('please update js-controller to at least 1.2.0');
            timeout = null;
            processTasks(tasks, callback);
        }, 1000);

        if (task.type === 'extendObject') {
            adapter.extendObject(task.id, task.data, function (/* err */) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                    setImmediate(processTasks, tasks, callback);
                }
            });
        } else  if (task.type === 'deleteState') {
            adapter.deleteState('', host, task.id, function (/* err */) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                    setImmediate(processTasks, tasks, callback);
                }
            });
        } else {
            adapter.log.error('Unknown task name: ' + JSON.stringify(task));
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                setImmediate(processTasks, tasks, callback);
            }
        }
    }
}

function updateDevice(ip) {

    var hs_state;
    var hs_sw_ver;
    var hs_hw_ver;
    var hs_model;
    var hs_mac;
    var hs_lastupdate;

// plug HS110
    var hs_current;
    var hs_power;
	var hs_voltage;
    var hs_total;
    var hs_emeter;
    var lb_bright;

  //  client.getDevice({host: ip}).then((result) => {
    client.getDevice({host: ip})
      .then(function(result) {
        if (result) {
            var jetzt = new Date();
            var hh =  jetzt.getHours();
            var mm =  jetzt.getMinutes();
            var ss =  jetzt.getSeconds();
            var jahr  = jetzt.getFullYear();
            var monat = jetzt.getMonth()+1;  // von 0 - 11 also +1
            var tag   = jetzt.getDate();

            if(hh < 10){hh = '0'+ hh;}
            if(mm < 10){mm = '0'+ mm;}
            if(ss < 10){ss = '0'+ ss;}

            hs_lastupdate = jahr + '.' + monat + '.' + tag + ' ' + hh + ':' + mm + ':' + ss;

            hs_mac    = result.mac;
            hs_sw_ver = result.softwareVersion;
            hs_hw_ver = result.hardwareVersion;
            hs_model  = result.model;
            hs_state  = result.sysInfo.relay_state;

            if (hs_state == 0) {
                hs_state = false;
            } else {
                hs_state = true;
            }

            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.sw_ver'  , hs_sw_ver || 'undefined', true);
            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.hw_ver'  , hs_hw_ver || 'undefined', true);
            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.model'   , hs_model  || 'undefined', true);
            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.mac'     , hs_mac    || 'undefined', true);
            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.state'   , hs_state, true);

            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.last_update', hs_lastupdate || '-1', true);

            adapter.log.debug('Refresh ' + ip + ' state = ' + hs_state + ' update = ' + hs_lastupdate);

            if (hs_model.indexOf('110') > 1) {
                result.emeter.getRealtime().then((result) => {
                    if (typeof result != "undefined") {
                        hs_current = result.current_ma;
                        hs_power = result.power_mw;
                        hs_voltage = result.voltage_mv;
                        hs_total = result.total_wh;

                        adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.current', hs_current || '0', true);
                        adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.power', hs_power || '0', true);
                        adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.voltage', hs_voltage || '0', true);
                        adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.total', hs_total || '0', true);

                        adapter.log.debug('Refresh Data HS110 ' + ip);
                    }
                });

                result.emeter.getMonthStats(jahr).then((result) => {
                    var mothList = result.month_list;

                    for (var i = 0; i < mothList.length; i++) {
                        if (mothList[i].month === monat) {
                            adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.totalMonthNow', mothList[i].energy || '0', true);
                        }
                    }

                    adapter.log.debug('Month HS110 ' + ip );
                });

                result.emeter.getDayStats(jahr, monat).then((result) => {
                    var dayList = result.day_list;
                    adapter.log.debug('Day HS110 ' + ip );
                });
            }
            if (hs_model.indexOf('LB') > 1) {
                if (result.sys_info.is_dimmable == 1) {

                    result.lighting.setLightState.then((result) => {
                        lb_bright = result.options.brightness;
                        adapter.setForeignState(adapter.namespace + '.' + ip.replace(/[.\s]+/g, '_') + '.brightness'   , lb_bright, true);
                    });
                }
            }
        }
    })
    .catch(function(result) {
        adapter.log.debug('HS not found : ' + ip );
    });
}


function getHS(hosts) {
    if (stopTimer) clearTimeout(stopTimer);

    if (!hosts) {
        hosts = [];
        for (var i = 0; i < adapter.config.devices.length; i++) {
            if (adapter.config.devices[i].ip.length > 5) {
                if (adapter.config.devices[i].active) {
                    hosts.push(adapter.config.devices[i].ip);
                }
            }
        }
    }

    if (!hosts.length) {
        timer = setTimeout(function () {
            getHS();
        }, adapter.config.interval);
        return;
    }

    var ip = hosts.pop();
    adapter.log.debug('HS Plug ' + ip);

    updateDevice(ip);

    if (!isStopping)  {
        setTimeout(function () {
            getHS(hosts);
        }, 0);
    };

}

function main() {
    host = adapter.host;
    adapter.log.debug('Host = ' + host);

    if (!adapter.config.devices.length) {
        adapter.log.info('No one IP configured');
        stop();
        return;
    }

    adapter.config.interval = parseInt(adapter.config.interval, 10);

// polling min 5 sec.
    if (adapter.config.interval < 5000) {
        adapter.config.interval = 5000;
    }

    syncConfig(function () {
        getHS();

    });

    adapter.subscribeStates('*');
}
