# REST API Reference

The REST API allows you to interact with the back4app entities,
using HTTP Requests.

With those endpoints, you can access your entities, changing, adding or
deleting data related to them.

## API Endpoint

All of the following API methods are accessible through the domain: `https://api.back4app.com`.

## API Access

Sending us the _App ID_, you will have access to your project, being able to
interact with the entities.

Basically, everything happens using your _Access Token_, as you make a
request. This will define if you have permission to interact with the
requested path, without telling us _your back4app credentials_ every time.

They must be sent inside the request's header.

## Paths

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

## How do I use it?

So, now you know all the methods in your hand. But how do they work?

Let's see it with some examples.

---

##### GET on /entity

On MyProject project, I've created an Person Entity. It has just only
one instance saved as a document on my database.

So, if we make this request

```http
GET /entities/Person
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this

```json
[{   
    "id" : "xxxxx01",
    "name" : "John Watson",
    "job" : "Doctor"
}]
```

It returns all the instances registered in database, using limits and pagination to separate
lots of data. We can also limit the result. See more on Queries section.

---

##### POST on /entity

Now, we want to insert a new Entity Instance. The POST method will take a JSON.

So, if we make this request

```http
POST /entities/Person
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

It will return us this

```json
{   
    "id" : "xxxxx02",
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```

It should be inserted on registered database.


---


##### GET on /entity:id

What about seeing ours new Entity Instance, specifically?
If we make this request

```http
GET /entities/Person
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us this

```json
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
GET /entities/Person/xxxxx02
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Returning this

```json
{   
    "id" : "xxxxx02",
    "name" : "Sherlock Holmes",
    "job" : "Consultant"
}
```


---


##### PUT on /entity:id

We want to change the current job of our Person.
If we make this request

```http
PUT /entities/Person/xxxxx02
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

{
    "job" : "Detective"
}
```

It will return us this

```json
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

So, we have this one Person that we want to remove from our database 
If we make this request

```http
DELETE /entities/Person/xxxxx02
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

It will return us an empty body with status code `204`.

The success of this operation is checked only using the status code. Check 
Status Code and Errors section.


---


## Queries

##### Query Constrains

To put constrains on the objects found, you may use the query URL parameter.
For example, you make a `GET` on `/entity/Person`, but you will receive a lot of
data that you may want to filter.

Using the the parameter `query`, you will be able to send a query to filter the
returned data, based on [MongoDB Query](https://docs.mongodb.org/manual/tutorial/query-documents/).

Since the query receives a JSON, it must be URLEncoded before sent as parameter.
```http
GET /entities/Person/?query={"job": "Doctor"}
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

To refine your query, you may use [Comparison Query Operators](https://docs.mongodb.org/manual/reference/operator/query-comparison/#comparison-query-operators),
just like MongoDB does. For example,

```http
GET /entities/Person/?query={"job": {$in: ["Doctor", "Teacher"]}}
Content-Type: application/json
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

##### Query Limits and Pagination

The parameters available to limit the returned data are `skip`, `limit`. Also you 
can `sort` it according to your preference.

| Parameter | Description | Default Value |
| --- | --- | --- |
|  skip  | Specify the number of objects to be skipped. Uses the skip method of MongoDB. Works with limit to paginate results. | 0 |
|  limit  | Specify the maximum number of results to be returned. Uses the limit method of MongoDB. | 30 |
|  sort  | Specify the order in which the document is returned. You can sort by multiple fields, in ascending or descending order. | {id: 1} |

Lets see some examples.

Specifying skip, limit on url:
```http
GET /entities/Person?skip=10&limit=20
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

The resulted json will be skipped the first 10 objects from where the cursor is.
If you want to implement pagination, you may use both of them.

Without specifying any of these parameters, Back{4}app will use the default 
value of all parameters, and will sort objects by id in ascendant order.

A `max-value limit` default is also defined. So, if you pass limit bigger than 100,
it will be automatically set to 100.

The sort parameter behaves like MongoDB, and contains field and value pair. To 
order it ascendantly the value may be 1, and descently, may be -1.

So, an example of sorting with multiple fields would be:
```http
GET /entities/Person?sort=-name,job
Content-Type: application/x-www-form-urlencoded
X-Access-Token: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
X-Application-ID: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```
On this example, the returned data will be sort first by name on descent order
and then by job on ascendant order.

## Status Codes and Errors

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
   
