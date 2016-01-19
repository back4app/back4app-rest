# API Security

When you use the API, access can be restricted by the `permissions` attribute on each entity. It is possible to set the `permissions` attribute on an object when creating it or if the user has access to edit the object.

The `permissions` is formatted as a JSON object where the keys are either user ids or the special key `"*"` to indicate public access permissions. The values of the permissions are JSON objects whose keys are the permission names and whose values are always `true`.

For example, if you want the user with id `"d23a49d8-e38a-4257-a44f-7ae927cc2259"` to have read and write access to an object, plus the object should be publicly readable, that corresponds to a `permissions` attribute like:

```json
{
  "d23a49d8-e38a-4257-a44f-7ae927cc2259": {
    "read": true,
    "write": true
  },
  "*": {
    "read": true
  }
}
```

## Signing Up

`User` is a builtin entity that holds authentication data (username and password). Creating a new user follows the same API as creating any other entity:

```http
POST /entities/User/
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}

{
  "username": "jack",
  "password": "super-secret"
}
```

The created user will be returned on the response:

```http
201 Created

{
  "id": "d23a49d8-e38a-4257-a44f-7ae927cc2259",
  "Entity": "User",
  "username": "jack",
  "permissions": {
    "d23a49d8-e38a-4257-a44f-7ae927cc2259": {
      "read": true,
      "write": true
    }
  }
}
```

All users are created by default with permissions that only allow access from itself.


## Logging In

After a user is created, it is possible to create a new session using its credentials. The session works as a way to authenticate future requests. To create a new session, send a POST request to `/login` with the username and password:

```http
POST /login
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}

{
  "username": "jack",
  "password": "super-secret"
}
```

In case of valid credentias, a new session token is returned:

```http
200 OK

{
  "sessionToken": "tLzMZ3sT4BpTGGopvmbfbzkaLZxmnxpq"
}
```

The session token can be used to authenticate requests by passing it on the HTTP header:

```http
X-Session-Token: tLzMZ3sT4BpTGGopvmbfbzkaLZxmnxpq
```

## Logging Out

If a session is no longer needed, it can be deleted by calling the logout method and passing the token on the headers:

```http
POST /logout
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}
X-Session-Token: {VALID_SESSION_TOKEN}
```

The result is a success response with an empty JSON:

```http
200 OK

{}
```

## Defining Permissions

In order to define permissions in an entity, the `permissions` attribute must the set. For example, to create an entity with read and write access to one user:

```http
POST /entities/Book/
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}

{
  "name": "The Divine Comedy",
  "stars": 5,
  "permissions": {
    "d23a49d8-e38a-4257-a44f-7ae927cc2259": {
      "read": true,
      "write": true
    }
  }
}
```

The result is the created entity:

```http
201 Created

{
  "id": "e3f7949d-0697-40bd-94dc-d6fb468c2cf2",
  "Entity": "Book",
  "name": "The Divine Comedy",
  "stars": 5,
  "permissions": {
    "d23a49d8-e38a-4257-a44f-7ae927cc2259": {
      "read": true,
      "write": true
    }
  }
}
```

If the `permissions` attribute is not present or set to `null`, then the entity will have public read and write permission.

## Querying Objects with Permissions

If an object has permissions defined, it will only be visible to users on the permission list. For example, in a database with two books: one public and one accesible to the user `jack`, the following queries may be performed.

A query with session token (user with id `d23a49d8-e38a-4257-a44f-7ae927cc2259` logged in before):

```http
GET /entities/Book/
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}
X-Session-Token: {VALID_SESSION_TOKEN}
```

The result may be:

```http
200 OK

{
  "results": [
    {
      "id": "b304d0dd-428d-4600-9c8a-5716d05e0f28",
      "Entity": "Book",
      "name": "Moby Dick",
      "stars": 4
    },
    {
      "id": "e3f7949d-0697-40bd-94dc-d6fb468c2cf2",
      "Entity": "Book",
      "name": "The Divine Comedy",
      "stars": 5,
      "permissions": {
        "d23a49d8-e38a-4257-a44f-7ae927cc2259": {
          "read": true,
          "write": true
        }
      }
    }
  ]
}
```

The same query could be done without a session token (no logged user):

```http
GET /entities/Book/
X-Application-ID: {YOUR_APPLICATION_ID}
X-Access-Token: {YOUR_ACCESS_TOKEN}
```

In this case, the result would not include the private entity:

```http
200 OK

{
  "results": [
    {
      "id": "b304d0dd-428d-4600-9c8a-5716d05e0f28",
      "Entity": "Book",
      "name": "Moby Dick",
      "stars": 4
    }
  ]
}
```

When querying for a list of entities, the ones without access to the given user are filtered out. If the user does not have access to any entity, an empty list will be returned. However, if an entity is queryied by id and the user does not have permission, an error is returned.

## Modifying/Deleting Objects with Permissions

The same rules as above apply to updating/deleting an object, except the logged user must have write access to the object. If the object has no permission declared, all users have write access to it.
