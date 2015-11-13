# REST API Reference

The REST API allows you to interact with the back4app entities,
using HTTP Requests.

With those endpoints, you can access your entities, changing, adding or
deleting data related to them.

## Table of contents

* [Authentication](#authentication)
* [Paths](#paths)
* [How do I use it?](#how-do-i-use-it)
 * [GET on /entity/](#get-on-entity)
 * [POST on /entity/](#post-on-entity)
 * [GET on /entity/id](#get-on-entityid)
 * [PUT on /entity/id](#put-on-entityid)
 * [DELETE on /entity/id](#delete-on-entityid)
* [Status Codes and Errors](#status-codes-and-errors)

<h2 id="authentication">Authentication</h2>

Sending us the _App ID_, you will have access to your project, being able to
interact with the entities.

Basically, everything happens using your _Access Token_, as you make a
request. This will define if you have permission to interact with the
requested path, without telling us _your back4app credentials_ every time.

They must be sent inside the request's header.

<h2 id="paths">Paths</h2>

The first generated paths will be the REST API endpoint, linking to your
resources.

The default path should be accessed through "/entities/".

But none of those paths will lead you to your data.
Using the name given to your entity, you will be allowed to make requests
using HTTP Methods:

| Method | Path | Action |
| --- | --- | --- |
| GET | /entity/ | Returns all the data from this Entity Instances. (Accepts a [MongoDB Query](https://docs.mongodb.org/manual/tutorial/query-documents/)) |
| POST | /entity/ | Creates a new Entity Instance with the data passed. |
| GET | /entity/id/ | Returns the data from the Entity Instance that matches with the given ID. |
| PUT | /entity/id/ | Updates the data from the Entity Instance that matches with the given ID. |
| DELETE | /entity/id/ | Delete the data from the Entity Instance that matches with the given ID. |

<h2 id="how-do-i-use-it">How do I use it?</h2>

So, now you know all the methods in your hand. But how do they work?

Let's see it with some examples.

---

<h5 id="get-on-entity">GET on /entity</h5>

On MyProject project, I've created an Person Entity. It has just only
one instance saved as a document on my database.

So, if we make this request
```http
GET /entities/v1/person HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this
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
Using the the parameter query, you will be able to send a query to filter the
returned data, based on [MongoDB Query](https://docs.mongodb.org/manual/tutorial/query-documents/).
Since the query receives a JSON, it must be URLEncoded before sent as parameter.

```http
https://api.back4app.com/entities/Person/?query=%7B+%22job%22+%3A+%22Doctor%22+%7D
```


---


<h5 id="post-on-entity">POST on /entity</h5>

Now, we want to insert a new Entity Instance. The POST method will take a JSON.

So, if we make this request
```http
POST /entities/v1/person HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

It will return us this
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


<h5 id="get-on-entityid">GET on /entity:id</h5>

What about seeing ours new Entity Instance, specifically?
If we make this request
```http
GET /entities/v1/person HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this
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

That's not what we want!

We should use its ID
```http
GET /entities/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
Returning this
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


<h5 id="put-on-entityid">PUT on /entity:id</h5>

We want to change the current job of our Person.
If we make this request
```http
PUT /entities/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "job" : "Detective"
}
```

It will return us this
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


<h5 id="delete-on-entityid">DELETE on /entity:id</h5>

So, we have this one Person that we want to remove from our database 
If we make this request
```http
DELETE /entities/v1/person/xxxxx02 HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this
```http
HTTP/1.x 204 OK
Content-Type: application/json;
```

The success of this operation is checked only using the status code.


---


<h2 id="status-codes-and-errors">Status Codes and Errors</h2>

Great part of the errors can be defined by its status codes.
But when they're not enough, the REST API will sent an error JSON,
that will always have "message" and "code".

If you try to do a GET Request to an unexistent entity/id, it will return
the 404 code, also used to not found routes.
The body shall show the difference, between not finding a route, page or a resource.

| Status Code | Caused By |
| --- | --- |
| 200 | Success. The requested was fulfilled and a resource was returned. |
| 201 | Successfully created resource. The brand new resource was created and returned. |
| 204 | Success, no content. The requested was fulfilled and no resource was returned. |
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
| DELETE /entity/id/ | 204, 400, 404 |
| Any other | 405 |
