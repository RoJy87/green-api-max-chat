# MAX Chat — GREEN-API

SPA-чат для отправки и получения **текстовых** сообщений в мессенджере **MAX**
через [GREEN-API](https://green-api.com/max). Прототип интерфейса — веб-версия
[MAX](https://web.max.ru/). Проект по тестовому заданию GREEN-API
(«Фронтенд разработчик React»).

## Возможности

- Вход по учётным данным инстанса GREEN-API: `apiUrl`, `idInstance`, `apiTokenInstance`
- Создание чата по номеру телефона получателя с проверкой наличия аккаунта MAX
- Отправка текстовых сообщений методом [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/)
- Приём входящих сообщений технологией [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/):
  цикл `receiveNotification` → обработка → `deleteNotification`
- Статусы доставки собственных сообщений (отправлено / доставлено / прочитано)
- Оптимистичный UI: сообщение появляется сразу, статусы подтягиваются из уведомлений
- Дедупликация: собственные сообщения, отправленные через API, не дублируются
- История чатов хранится в `localStorage`; учётные данные — только в `localStorage` браузера

## Технологии

- React 19 + TypeScript
- Vite
- Чистый CSS без UI-библиотек

## Подготовка инстанса GREEN-API

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com) и создайте инстанс MAX (тариф Developer бесплатный, лимит 3 чата).
2. Авторизуйте инстанс по QR-коду из личного кабинета (приложение MAX должно быть установлено на телефоне).
3. В настройках инстанса включите получение уведомлений **без webhook**:
   - «Получать уведомления о входящих сообщениях» — вкл.
   - «Получать уведомления об отправленных сообщениях» — вкл.
   - Webhook URL — пустой (тогда уведомления забираются поллингом HTTP API).
4. Скопируйте со страницы инстанса: `apiUrl` (например, `https://3100.api.green-api.com`), `idInstance`, `apiTokenInstance`.

## Локальный запуск

Требуется Node.js 20+.

```bash
npm install
npm run dev
```

Откройте адрес из вывода (по умолчанию http://localhost:5173), введите
учётные данные инстанса — и создайте чат по номеру телефона получателя
(например `79991234567`).

## Продакшен-сборка

```bash
npm run build   # сборка в dist/
npm run preview # локальный просмотр собранной версии
```

## Как устроено

- `src/api/greenApi.ts` — тонкий HTTP-клиент GREEN-API: `getStateInstance`,
  `checkAccount`, `sendMessage`, `receiveNotification`, `deleteNotification`.
  Номер резолвится в числовой `chatId` MAX методом `checkAccount`.
- `src/hooks/useChatStore.ts` — состояние чатов, оптимистичная отправка и
  поллинг-цикл. FIFO-контракт соблюдается: уведомление удаляется
  (`deleteNotification`) только после применения к состоянию; при пустой
  очереди `receiveNotification` отвечает `204` и цикл ждёт следующий тик.
- Фильтрация уведомлений: обрабатываются только текстовые
  `incomingMessageReceived` и `outgoingAPIMessageReceived`, а также
  `outgoingMessageStatus` для статусов. Медиа, реакции, сервисные и
  неизвестные типы пропускаются (и подтверждаются, чтобы не блокировать очередь).
- CORS: API GREEN-API отдаёт `Access-Control-Allow-Origin: *`, поэтому
  приложение ходит в API напрямую из браузера, без прокси.

## Структура

```
src/
  api/        # клиент GREEN-API и работа с учётными данными (localStorage)
  components/ # ChatList, ChatWindow, MessageBubble
  hooks/      # useChatStore (поллинг + состояние), chatsStorage
  pages/      # LoginPage
  types/      # доменные типы и guard-функции уведомлений
```
