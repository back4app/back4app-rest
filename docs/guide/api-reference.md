# REST API Reference

The REST API allows you to interact with the back4app entities,
using HTTP Requests.

With those endpoints, you can access your entities, changing, adding or
deleting data related to them.

## Table of contents

* [API Access](#api-access)
* [Paths](#paths)
* [How do I use it?](#how-do-i-use-it)
 * [GET on /entity/](#get-on-entity)
 * [POST on /entity/](#post-on-entity)
 * [GET on /entity/id](#get-on-entityid)
 * [PUT on /entity/id](#put-on-entityid)
 * [DELETE on /entity/id](#delete-on-entityid)
* [Queries](#queries)
 * [Query Constrains](#query-constrains)
 * [Query Limits](#query-limits-pagination)
* [Status Codes and Errors](#status-codes-and-errors)

<h2 id="api-access">API Access</h2>

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
GET /entities/Person HTTP/1.1
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

It returns all the instances registered in database, using limits and pagination to separate
lots of data. We can also limit the result. See more on [Queries](#queries) section.

---

<h5 id="post-on-entity">POST on /entity</h5>

Now, we want to insert a new Entity Instance. The POST method will take a JSON.

So, if we make this request

```http
POST /entities/Person HTTP/1.1
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
GET /entities/Person HTTP/1.1
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
GET /entities/Person/xxxxx02 HTTP/1.1
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
PUT /entities/Person/xxxxx02 HTTP/1.1
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
DELETE /entities/Person/xxxxx02 HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this

```http
HTTP/1.x 204 OK
Content-Type: application/json;
```

The success of this operation is checked only using the status code. Check 
[Status Code and Errors](#status-codes-and-errors) section.


---


<h2 id="queries">Queries</h2>

<h5 id="query-constrains">Query Constrains</h5>
To put constrains on the objects found, you may use the query URL parameter.
For example, you make a GET on /entity/Person, but you will receive a lot of
datathat you may want to filter.

Using the the parameter "query", you will be able to send a query to filter the
returned data, based on [MongoDB Query](https://docs.mongodb.org/manual/tutorial/query-documents/).

Since the query receives a JSON, it must be URLEncoded before sent as parameter.
```http
GET /entities/Person/?query={"job":"Doctor"} HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

To refine your query, you may use [Comparison Query Operators](https://docs.mongodb.org/manual/reference/operator/query-comparison/#comparison-query-operators),
just like MongoDB does. For example,

```http
GET /entities/Person/?query=$in: ['Doctor', 'Teacher']} HTTP/1.1
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

<h5 id="query-limits-pagination">Query Limits and Pagination</h5>

The parameters available to limit the returned data are skip, limit. Also you 
can sort it according to your preference.

| Parameter | Description | Default Value |
| --- | --- | --- |
|  skip  | Specify the number of objects to be skipped. Uses the skip method of MongoDB. Works with limit to paginate results. | 0 |
|  limit  | Specify the maximum number of results to be returned. Uses the limit method of MongoDB. | 30 |
|  sort  | Specify the order in which the document is returned. You can sort by multiple fields, in ascending or descending order. | {_id: 1} |

Lets see some examples.

Specifying skip, limit on url:
```http
GET /entities/Person?skip=10&limit=20 HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The resulted json will be skipped the first 10 objects from where the cursor is.
If you want to implement pagination, you may use both of then.

Without specifying any of these parameters, Back{4}app will use the default 
value of all parameters, and will sort objects by id in ascendant order.

A max-value limit default is also defined. So, if you pass limit bigger than 100,
it will be automatically set to 100.

The sort parameter behaves like MongoDB, and contains field and value pair. To 
order ascendantly the value may be 1 and descently, may be -1.

So, an example of sorting with multiple fields would be:
```http
GET /entities/Person?sort=-name,job HTTP/1.1
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
On this example, the returned data will be sort first by name on descent order
and then by job on ascendant order.

<h2 id="status-codes-and-errors">Status Codes and Errors</h2>

Great part of the errors can be defined by its status codes.
But when they're not enough, the REST API will sent an error JSON,
that will always have "message" and "code".

If you try to do a GET Request to an nonexistent entity/id, it will return
the 404 code, also used to not found routes.
The body shall show the difference, between not finding a route, page or a resource.

| Status Code | HTTP Status | Error |
| --- | --- | --- |
|  1  | 500 Internal Server Error | Internal Server Error |
| 101 | 400 Bad Request | Invalid Query |
| 102 | 400 Bad Request | Invalid JSON |
| 103 | 400 Bad Request | Invalid Entity |
| 104 | 400 Bad Request | Duplicate Entity |
| 111 | 401 Unauthorized | Application ID Missing |
| 112 | 401 Unauthorized | Access Token Missing |
| 113 | 401 Unauthorized | Invalid API Credentials |
| 114 | 401 Unauthorized | Username Missing |
| 115 | 401 Unauthorized | Password Missing |
| 116 | 401 Unauthorized | Invalid User Credentials |
| 117 | 401 Unauthorized | Invalid Session Token |
| 118 | 403 Forbidden | Operation Forbidden |
| 121 | 404 Not Found | URL Not Found |
| 122 | 404 Not Found | Entity Not Found |
| 123 | 404 Not Found | Object Not Found |  
   
