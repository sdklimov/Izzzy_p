# Telegram Bot URL Parser

API сервис для извлечения метаданных из URL через Telegram Bot API. Использует MTProto для получения веб-превью точно так же, как это делает Telegram.

## Возможности

- Извлечение метаданных из любых URL (заголовок, описание, изображения)
- Поддержка всех типов контента, которые поддерживает Telegram
- REST API интерфейс
- Готовый Docker образ
- Переиспользование авторизованной сессии Telegram

## Требования

- Node.js 20+ (для локального запуска)
- Docker (опционально)
- Telegram аккаунт
- API credentials от Telegram

## Быстрый старт

### 1. Получение Telegram API credentials

1. Перейдите на https://my.telegram.org/apps
2. Войдите с вашим номером телефона
3. Перейдите в "API development tools"
4. Создайте новое приложение
5. Скопируйте `API_ID` и `API_HASH`

### 2. Настройка окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

Отредактируйте `.env` и укажите ваши credentials:

```env
API_ID=12345678
API_HASH=ваш_api_hash_здесь
API_HOST=0.0.0.0
API_PORT=8000
PARSE_TIMEOUT=30000
```

### 3. Установка зависимостей

```bash
npm install
```

### 4. Авторизация в Telegram

**ВАЖНО:** Перед первым запуском необходимо авторизоваться в Telegram. Это нужно сделать **один раз**.

```bash
npm run auth
```

Скрипт запросит:
1. Номер телефона (с кодом страны, например: +79001234567)
2. Код подтверждения из Telegram
3. Пароль двухфакторной аутентификации (если включена)

После успешной авторизации будет создан файл `session.json` с сохранённой сессией.

### 5. Запуск сервиса

#### Локально

```bash
npm start
```

Сервис будет доступен по адресу: `http://localhost:8000`

#### С Docker

```bash
# Сборка образа
docker build -t tg-bot-parser .

# Запуск контейнера с монтированием session.json
docker run -d \
  --name tg-bot-parser \
  -p 8000:8000 \
  -v $(pwd)/session.json:/app/session.json:ro \
  -v $(pwd)/.env:/app/.env:ro \
  tg-bot-parser
```

**Примечание:** Файл `session.json` должен быть создан ДО запуска Docker контейнера через `npm run auth`.

#### С Docker Compose

Создайте файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
  tg-bot-parser:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./session.json:/app/session.json:ro
      - ./.env:/app/.env:ro
    restart: unless-stopped
```

Запуск:

```bash
docker-compose up -d
```

## API Endpoints

### GET `/`
Информация о сервисе

**Ответ:**
```json
{
  "service": "Telegram Bot URL Parser",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /api/health",
    "parse": "POST /api/parse"
  }
}
```

### GET `/api/health`
Проверка работоспособности сервиса

**Ответ:**
```json
{
  "status": "ok",
  "service": "tg-bot-parser"
}
```

### POST `/api/parse`
Парсинг метаданных из URL

**Запрос:**
```json
{
  "url": "https://example.com/article"
}
```

**Ответ (успешный):**
```json
{
  "success": true,
  "url": "https://example.com/article",
  "metadata": {
    "title": "Article Title",
    "description": "Article description text...",
    "image": "https://example.com/image.jpg",
    "siteName": "Example Site",
    "type": "article"
  },
  "error": null
}
```

**Ответ (ошибка):**
```json
{
  "success": false,
  "url": "https://example.com/article",
  "metadata": null,
  "error": "Error message"
}
```

## Примеры использования

### cURL

```bash
curl -X POST http://localhost:8000/api/parse \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
```

### JavaScript (fetch)

```javascript
const response = await fetch('http://localhost:8000/api/parse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://github.com'
  })
});

const data = await response.json();
console.log(data.metadata);
```

### Python (requests)

```python
import requests

response = requests.post(
    'http://localhost:8000/api/parse',
    json={'url': 'https://github.com'}
)

data = response.json()
print(data['metadata'])
```

## Устранение неполадок

### Ошибка "Session file not found"

Если при запуске вы видите:
```
❌ ERROR: No session file found!
```

**Решение:** Запустите `npm run auth` для создания файла сессии.

### Ошибка авторизации в Docker

Если контейнер не может авторизоваться:

1. Убедитесь, что `session.json` создан локально через `npm run auth`
2. Проверьте, что файл примонтирован в контейнер:
   ```bash
   docker exec tg-bot-parser ls -la /app/session.json
   ```
3. Убедитесь, что файл `.env` также примонтирован

### Авторизация устарела

Если сессия перестала работать (например, вы сменили пароль):

1. Удалите старый `session.json`
2. Запустите `npm run auth` заново
3. Перезапустите контейнер

## Структура проекта

```
tg-bot-parser/
├── src/
│   ├── index.js      # Точка входа, Express сервер
│   ├── api.js        # API роуты
│   ├── bot.js        # Логика парсинга URL
│   ├── botApi.js     # Telegram Bot API клиент
│   ├── client.js     # MTProto клиент
│   ├── config.js     # Конфигурация
│   └── auth.js       # Скрипт авторизации
├── Dockerfile
├── .env.example
├── package.json
└── README.md
```

## Безопасность

- **Никогда не коммитьте** файлы `session.json` и `.env` в git
- `session.json` содержит авторизационные данные вашего Telegram аккаунта
- Храните эти файлы в безопасном месте
- Используйте монтирование в режиме read-only (`:ro`) для Docker

## Лицензия

MIT

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker logs tg-bot-parser`
2. Убедитесь, что API_ID и API_HASH корректны
3. Проверьте, что `session.json` существует и доступен
