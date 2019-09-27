# Access external ProcessEngine with ManagementAPI

This sample demonstrates how to use the `ManagementApiClientService` to access
a ProcessEngine, which is contained directly within the application.

![Architecture with external ProcessEngine](../images/management_api_external.png)

## Sample Components

This sample consists of three individual applications:

- **Server**: Contains a process engine and an endpoint for the ManagementAPI.
  Use this application to provide an endpoint for your clients
- **Clients**: There are two different client applications that you can use to
  access the server application:
  - One basic client that manually creates an instance of the
  `ManagementApiClientService` and a `CustomerContext`
  - One client that makes full use of addict-ioc, including its container

Both clients will perform the same sample script.
The only difference is in how they are set up.

## Requirements

All applications have the following minimal requirements:

- NodeJS v10.15.x

## Setup

You must run the following commands in the server and client applications:

- `npm install` or
- `npm install --no-package-lock` if you do not want npm to create a lockfile
- `npm run build`

The sample uses SQLite as its datastorage. The database file will be placed
directly into the sample folder and bears the name `processengine.sqlite`.

There is no need to configure anything.

## Executing the sample

You can use `npm start` to start each application.

Note that the server will only start up and then wait for connections.
The clients will run their sample script and then shutdown.

To shutdown the server, you can use the usual `ctrl+c` command.

## Step By Step

The sample codes have been commented extensively, so you can follow each
step of the program.

The server handles the following operations:

- Accept incoming HTTP Requests from the clients
- Use the ManagementAPI to perform each operation made by the client:
  - start the sample process
  - retrieve waiting UserTasks
  - finish a UserTask with a given payload
  - retrieve a process instance result

Each client will perform the following actions:

- Create an instance for the `ManagementApiClientService`
  - The client will be given an accessor for accessing the server's
    ProcessEngine
- Use the `ManagementApiClientService` to
  - start the sample process
  - retrieve the waiting UserTask for the sample process when it is reached
  - finish the UserTask with a given payload
  - retrieve and log the process instance result
