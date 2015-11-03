# REST API Reference

The REST API allows you to interact with the back4app entities,
using HTTP Requests.

With those endpoints, you can access your entities, changing, adding or
deleting data related to them.

## Authentication

Sending us the _App ID_, you will have access to your project, beign able to
interact with the entities.

Basically, everything happens using you _authentication Token_, as you make a
request. This will define if you have permission to interact with the
requested path, without telling us your back4app credentials every time.

They must be sent inside the request's header.
<!--

Considering the possibility of the user hosting his own code,
the authentication layer for the API use would be not
our responsability.
This was not considered on this section.

-->


## Paths

The first generated paths will be the REST API endpoint, linking to your
resources.

The default path should be accessed through "/api/".

But none of those paths will lead you to your data.
Using the name given to your entity, you will be allowed to make requests
using HTTP Methods:

| Method | Path | Action |
| --- | --- | --- |
| GET | /entity/ | Returns all the data from this Entity Instances. |
| POST | /entity/ | Creates a new Entity Instance with the data passed. |
| GET | /entity/id/ | Returns the data from the Entity Instance that matches with the given ID. |
| PUT | /entity/id/ | Updates the data from the Entity Instance that matches with the given ID. |
| DELETE | /entity/id/ | Delete the data from the Entity Instance that matches with the given ID. |

## How do I use it?

So, now you know all the methods in your hand. But how do they work?

Let's see it with some examples.

---

##### GET on /entity

On MyProject project, I've created an Person Entity. It has just only
one instance saved as a document on my database.

So, if I make this request
```http
GET /api/v1/person HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return me this
```http
HTTP/1.x 200 OK
Content-Type: application/json;
 
[{   
    "id" : "xxxxx01",
    "name" : "John Watson",
    "job" : "Doctor"
}]
```

It returns all the instances registered in database, using pagination to separate
lots of data.
Using the the parameter q, you will be able to send a query to filter the
returned data.
Since the query receives a JSON, it must be URLEncoded before sent as parameter.


---


##### POST on /entity

Now, I want to insert a new Entity Instance. It doesn't matter how it was
before, the POST method will take a JSON.

So, if I make this request
```http
POST /api/v1/person HTTP/1.1
Content-Type: application/json
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

It will return me this
```http
HTTP/1.x 201 OK
Content-Type: application/json;
 
{   
    "id" : "xxxxx02",
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

It should be inserted on registered database.

---

##### GET on /entity:id

What about seeing my new Entity Instance, specifically?
If I make this request
```http
GET /api/v1/person HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return me this
```http
HTTP/1.x 200 OK
Content-Type: application/json;
 
[{   
    "id" : "xxxxx01",
    "name" : "John Watson",
    "job" : "Doctor"
},
{
    "id" : "xxxxx02",
        "name" : "Sherlock Holmes",
        "job" : "Consultant"
}]
```

That's not what I want!

We should use its ID
```http
GET /api/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
Retuning this
```http
HTTP/1.x 200 OK
Content-Type: application/json;
 
{   
    "id" : "xxxxx02",
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

---

##### PUT on /entity:id

I want to change the current job of my Person, since it is unclear.
If I make this request
```http
PUT /api/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/json
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "job" : "Detective"
}
```

It will return me this
```http
HTTP/1.x 200 OK
Content-Type: application/json;
 
{   
    "id" : "xxxxx02",
    "name" : "Sherlock Holmes",
    "job" : "Detective"
}
```

It should be used in any case of changing or updating data which is already
inserted on database.

---

##### DELETE on /entity:id

So, I have this one Person that I want to remove from my database 
If I make this request
```http
DELETE /api/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/json
Access_token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return me this
```http
HTTP/1.x 200 OK
Content-Type: application/json;
```

The success of this operation is checked only using the status code.

---

## Status Codes and Errors

Great part of the errors can be defined by its status codes.
But when they're not enough, the REST API will sent an error JSON,
that will always have "message", "code" and "body".

If you try to do a GET Request to an unexistent entity/id, it will return
the 404 code, also used to not found routes.
The body shall show the difference, between not finding a route, page or a resource.

| Status Code | Caused By |
| --- | --- |
| 200 | Success. The requested was fulfilled and a resource was returned. |
| 201 | Successfully created resource. The brand new resource was created and returned. |
| 400 | Bad request. The request was not accepted by the server. It can come from any method that sends an bad body. |
| 401 | Bad Credentials. For some reason, you're unable to use the credentials you sent (if you sent it). |
| 403 | Forbidden Access. Even though you have valid credentials, you're not allowed to access whatever you've tried to. |
| 404 | Not found. The route/page/resource you've tried to reach does not exist. |
| 405 | Method not Allowed. The method within your request is not allowed. |
| 500 | Internal Error. Something bad happened while trying to process your request. The message may tell you some details about it. |

| Methods/Route | Possible Status |
| --- | --- |
| (All) | 401, 403, 500 |
| GET /entity/ | 200, 400 |
| POST /entity/ | 201, 400 |
| GET /entity/id/ | 200, 400, 404 |
| POST /entity/id/ | 200, 400, 404 |
| PUT /entity/id/ | 200, 400, 404 |
| DELETE /entity/id/ | 200, 400, 404 |
| Any other | 405 |
