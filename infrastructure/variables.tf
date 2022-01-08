variable "environment" {
    default = "development"
}

variable "aws_region" {
    default = "us-east-1"
}

variable "eb_app_name" {
    type = string
}

variable "eb_app_description" {
    default = "TextGrab main server"
}

variable "eb_solution_stack_name" {
    default = "64bit Amazon Linux 2 v3.3.9 running Python 3.8"
}

variable "eb_instance_port" {
    default = "8000"
}

variable "eb_instance_type" {
    default = "t2.micro"
}

variable "eb_asg_min_size" {
    default = 1
}

variable "eb_asg_max_size" {
    default = 2
}
variable "google_application_creds" {
    type = string
}

variable "certificate_arn" {
    type = string
}