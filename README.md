# Delayed scheduler

## Mechanism

Components:

- server -> http server
- worker -> evaluates and executes immediate messages
- scheduler -> checks by timestamp delayed message and publishes valid ones to the immediate-queue

### Workflows

Implementation details concerning the usage of redis: based on the way our problem is described, I would start look over ZSET.

For each entry, the score is the timestamp when we want it to be processed, and the content is a json encoded string. (maybe we want to develop this later and it's easier to adapt it this way) We then have a
process that checks for items that should be processed now; when something is matched, this process will remove the message from the ZSET, adding it to the proper LIST queue.

Item structure:

- one unique identifier
- the message body

Operations:

- consider delay = messageTime - now
- if delay > 0 -> ZADD() - schedule for later
- else -> RPUSH() - execute immediately

If an item is to be executed immediately, it will be inserted into the exec list queue instead.

## Sending a request (aka scheduling a message)

```
POST /echoAtTime HTTP/1.1
content-type: application/json
Cache-Control: no-cache

{ "time": "2020-08-03T00:17:50", "message": "Its 2020-08-03T00:18:10" }
```

## Test coverage

Test are done using jest.

```
yarn run v1.22.4
$ ./node_modules/.bin/jest --coverage
 PASS  src/util/dotenv.test.js
 PASS  src/service/redis.test.js
 PASS  src/middleware/scheduler.test.js
 PASS  src/service/message.test.js (7.122 s)
  ● Console

    console.log
      handleMessage { id: 'someId_1596411242433' }

      at handleMessage (src/service/message.js:33:11)

---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |   95.45 |    92.86 |   88.89 |   96.88 |
 middleware    |      50 |      100 |      50 |      50 |
  scheduler.js |      50 |      100 |      50 |      50 | 5-6
 service       |   98.36 |    92.86 |   93.75 |     100 |
  message.js   |     100 |    91.67 |     100 |     100 | 70
  redis.js     |      96 |      100 |    87.5 |     100 |
 util          |     100 |      100 |     100 |     100 |
  dotenv.js    |     100 |      100 |     100 |     100 |
---------------|---------|----------|---------|---------|-------------------

Test Suites: 4 passed, 4 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        7.424 s, estimated 8 s
Ran all test suites.
Done in 7.84s.
```

## Misc

### Docker containers

See list under docker/docker-compose.yml

Containers:

- http -> http server
- redis -> redis instance (v5)
- ma_scheduler -> logic concerning the delayed elements set
- ma_worker -> executor for the scheduled messages queue

### Env vile

```
REDIS_DSN -> redis DSN
HTTP_PORT -> HTTP listen port (container / local env - match with exposed port for docker)
WORKER_DELAY -> delay (ms) between calls for fetching ready items
SCHEDULER_DELAY -> delay for the scheduler between ticks
```

### Sample output

Running multiple workers / schedulers (see logs for locking mechanism for schedulers)

```
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '249bc2b8-87cf-49d4-913c-d74bee0a13c1',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_scheduler_5  | PID: 47 - Locked resource: 350a0c78-cab8-43fa-8812-6295c7a8feff
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '31bb63ef-ef42-478a-ab48-4d2edf46f4ca',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '34144a1d-f66c-48ed-beb9-bc4a02896fbd',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '350a0c78-cab8-43fa-8812-6295c7a8feff',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '5d3802e0-c1c5-407c-8f78-979fc84be4d7',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_scheduler_5  | PID: 47 - Locked resource: 1db35757-d0dc-4cc0-b6f5-ae7435edd79d
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'a1e3c1d6-f8dc-4f46-9fd1-1883e534ab52',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'a7be64b5-70f0-47e3-b9d9-eeb1fe5bc218',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'aa28399e-e505-4ecb-b36d-0fc1fa451e27',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'af9b81fe-3703-480e-8cc0-91b26c7155dd',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_scheduler_5  | PID: 47 - Locked resource: 2cb0ed40-67d7-483d-bd93-00eec8a52445
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'afe9675e-c168-46f5-baaf-54f9f90922bd',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'b9d2c624-eb39-466e-a7b7-cc562e9c194d',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'bdfde07c-69cc-4e71-849e-d8dfdad333b3',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'be61f123-c46b-4dc0-b1d9-654c705881ea',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_scheduler_5  | PID: 47 - Locked resource: 5948348a-cdea-49c2-a544-2bac9c8279dc
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'c4504a14-4080-4934-b7b0-4a09d3d478ab',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'c505c51d-9722-4303-b9c3-af6a85de5416',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'cf43be68-47a3-4c40-adb6-b4ac4b73a506',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'd0b776f1-95ad-4a70-b998-935afbb077f1',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'dd1eef22-fb13-419c-85ef-3b3fdbf191d2',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'ebd7492b-a38e-4df9-ac8b-1b40fe4d5a75',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'eccfac99-3ea9-4d66-b910-5ea658afa018',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'f5103388-f882-457f-a0f0-d7cad2ea34c9',
ma_worker_2     |   time: '2020-08-02T23:48:10',
ma_worker_2     |   timestamp: 1596412090000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'fcf0719a-dffa-472f-acde-f83c25c25654',
ma_worker_1     |   time: '2020-08-02T23:48:10',
ma_worker_1     |   timestamp: 1596412090000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '1db35757-d0dc-4cc0-b6f5-ae7435edd79d',
ma_worker_2     |   time: '2020-08-02T23:48:11',
ma_worker_2     |   timestamp: 1596412091000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '1fa5c4a3-5a7e-4f47-828e-5c1d5d773c23',
ma_worker_1     |   time: '2020-08-02T23:48:11',
ma_worker_1     |   timestamp: 1596412091000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '3fabac41-b58d-4627-bc11-7e8cd193e2ff',
ma_worker_2     |   time: '2020-08-02T23:48:11',
ma_worker_2     |   timestamp: 1596412091000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '57b4b385-8a0e-429e-ad6a-b91fc93b1fbf',
ma_worker_1     |   time: '2020-08-02T23:48:11',
ma_worker_1     |   timestamp: 1596412091000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '73532e89-5eaf-4958-9d52-b1e860be5b12',
ma_worker_2     |   time: '2020-08-02T23:48:11',
ma_worker_2     |   timestamp: 1596412091000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '84ee8ad1-a510-4d81-871d-121302a7c276',
ma_worker_1     |   time: '2020-08-02T23:48:11',
ma_worker_1     |   timestamp: 1596412091000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'd47f60b4-65c8-4e45-83fc-27d7e1d77d6b',
ma_worker_2     |   time: '2020-08-02T23:48:11',
ma_worker_2     |   timestamp: 1596412091000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'f8b62057-954f-4fc7-9e64-ed0b7eccc1c0',
ma_worker_1     |   time: '2020-08-02T23:48:11',
ma_worker_1     |   timestamp: 1596412091000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '080e91e0-9bf9-4d23-acd1-903f2a162745',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '0a69cdcd-7d49-408e-a957-c9be3511103e',
ma_worker_1     |   time: '2020-08-02T23:48:12',
ma_worker_1     |   timestamp: 1596412092000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '1d01a112-6e90-48c7-9283-499cb77a3ef2',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '2cb0ed40-67d7-483d-bd93-00eec8a52445',
ma_worker_1     |   time: '2020-08-02T23:48:12',
ma_worker_1     |   timestamp: 1596412092000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '347738ac-8455-426e-9c87-160e6ef76b5b',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '4ebc2fc3-1a1b-4b80-9df9-4fefb853de13',
ma_worker_1     |   time: '2020-08-02T23:48:12',
ma_worker_1     |   timestamp: 1596412092000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '76a8e2e9-2fdb-4b18-8f85-a05835b54037',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'c6e3ea30-aaab-4cab-b64d-906d7b56963a',
ma_worker_1     |   time: '2020-08-02T23:48:12',
ma_worker_1     |   timestamp: 1596412092000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'd9e5e14f-5768-4d02-a1fe-66492af7ac63',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'e834e05e-06ad-481e-9063-f1ddd83dd858',
ma_worker_1     |   time: '2020-08-02T23:48:12',
ma_worker_1     |   timestamp: 1596412092000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'efa62b94-beb3-44d8-9d50-5a1567225741',
ma_worker_2     |   time: '2020-08-02T23:48:12',
ma_worker_2     |   timestamp: 1596412092000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '04d0b095-0223-492d-b839-13cb0d7cbb86',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '3f7b6478-4a03-4c6c-80ca-27623332e7ba',
ma_worker_2     |   time: '2020-08-02T23:48:13',
ma_worker_2     |   timestamp: 1596412093000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '521a3c33-4d31-4d96-af49-3c7039df1930',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '5948348a-cdea-49c2-a544-2bac9c8279dc',
ma_worker_2     |   time: '2020-08-02T23:48:13',
ma_worker_2     |   timestamp: 1596412093000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '5f6da838-e037-491d-93c6-cd6bd736b493',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '67d12e9a-210d-45ed-9140-4d583a861da7',
ma_worker_2     |   time: '2020-08-02T23:48:13',
ma_worker_2     |   timestamp: 1596412093000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '812132ab-9567-4461-854d-cc9043408e66',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'c1e5704e-2431-4abc-97bb-c9a81b495408',
ma_worker_2     |   time: '2020-08-02T23:48:13',
ma_worker_2     |   timestamp: 1596412093000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'c374ce16-e506-4b62-b47b-4e7663c8b224',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'c432cecb-2973-4b32-84a4-378be6963ec9',
ma_worker_2     |   time: '2020-08-02T23:48:13',
ma_worker_2     |   timestamp: 1596412093000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'dfc67fde-0059-4688-97f8-dc88f40e5d1a',
ma_worker_1     |   time: '2020-08-02T23:48:13',
ma_worker_1     |   timestamp: 1596412093000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '0369ae64-4e90-46fe-9129-1ba3c6a747c7',
ma_worker_2     |   time: '2020-08-02T23:48:14',
ma_worker_2     |   timestamp: 1596412094000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '2dd187fa-9327-46eb-b8dd-3d435723d116',
ma_worker_1     |   time: '2020-08-02T23:48:14',
ma_worker_1     |   timestamp: 1596412094000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '4cbccc05-e358-4a0e-85ac-1c3747ea09de',
ma_worker_2     |   time: '2020-08-02T23:48:14',
ma_worker_2     |   timestamp: 1596412094000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '94cd314f-6106-4c43-906e-8f1239e6f694',
ma_worker_1     |   time: '2020-08-02T23:48:14',
ma_worker_1     |   timestamp: 1596412094000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '0a717ada-019c-428d-95f0-77041c36b2c5',
ma_worker_2     |   time: '2020-08-02T23:48:15',
ma_worker_2     |   timestamp: 1596412095000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: '3d728d77-f918-4ec1-b7e4-72e14bf81f5a',
ma_worker_1     |   time: '2020-08-02T23:48:15',
ma_worker_1     |   timestamp: 1596412095000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: '3ffba5f7-df90-4128-8554-f7edb80ad6b9',
ma_worker_2     |   time: '2020-08-02T23:48:15',
ma_worker_2     |   timestamp: 1596412095000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'c668c0db-ee2b-4885-90e6-3fc6f6bc0091',
ma_worker_1     |   time: '2020-08-02T23:48:15',
ma_worker_1     |   timestamp: 1596412095000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'cf9db19d-b1f3-4bb8-b712-f0500126daca',
ma_worker_2     |   time: '2020-08-02T23:48:15',
ma_worker_2     |   timestamp: 1596412095000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
ma_worker_1     | PID: 39 - handleMessage {
ma_worker_1     |   id: 'd238b42a-4b7b-4527-9eb1-1ec682270d7d',
ma_worker_1     |   time: '2020-08-02T23:48:15',
ma_worker_1     |   timestamp: 1596412095000,
ma_worker_1     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_1     | }
ma_worker_1     | ---
ma_worker_2     | PID: 47 - handleMessage {
ma_worker_2     |   id: 'fb091b50-8b43-4b18-be1b-c6ebdfee5398',
ma_worker_2     |   time: '2020-08-02T23:48:15',
ma_worker_2     |   timestamp: 1596412095000,
ma_worker_2     |   message: 'Its 2020-08-03T00:18:10'
ma_worker_2     | }
ma_worker_2     | ---
```
