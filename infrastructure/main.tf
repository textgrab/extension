
########
# ELASTIC BEANSTALK
########

# Application

resource "aws_elastic_beanstalk_application" "server" {
    name        = var.eb_app_name
    description = var.eb_app_description
}

# will need this later for RDS
resource "aws_security_group" "server-sg" {
  name = "server-sg"

  description = "Server (terraform-managed)"
  vpc_id      = aws_vpc.main-vpc.id

  # Allow all outbound traffic.
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
  }
}


resource "aws_elastic_beanstalk_environment" "serverEnvironment" {
    name                = var.environment
    application         = aws_elastic_beanstalk_application.server.name
    solution_stack_name = var.eb_solution_stack_name
    setting {
        namespace = "aws:ec2:vpc"
        name      = "VPCId"
        value     = aws_vpc.main-vpc.id
    }
    setting {
        namespace = "aws:ec2:vpc"
        name      = "Subnets"
        value     = join(",", [aws_subnet.subnet-public-1.id, aws_subnet.subnet-public-2.id])
    }
    setting {
        namespace = "aws:ec2:vpc"
        name      = "ELBScheme"
        value     = "internet facing"
    }
    setting {
        namespace = "aws:elasticbeanstalk:environment"
        name      = "LoadBalancerType"
        value     = "application"
    }
    setting {
        namespace = "aws:elasticbeanstalk:environment:process:default"
        name      = "MatcherHTTPCode"
        value     = "200"
    }
    setting {
        namespace = "aws:elasticbeanstalk:environment:process:default"
        name      = "Port"
        value     = var.eb_instance_port
    }
    setting {
        namespace = "aws:autoscaling:launchconfiguration"
        name      = "InstanceType"
        value     = var.eb_instance_type
    }
    setting {
        namespace = "aws:autoscaling:asg"
        name      = "MinSize"
        value     = var.eb_asg_min_size
    }
    setting {
        namespace = "aws:autoscaling:asg"
        name      = "MaxSize"
        value     = var.eb_asg_max_size
    }
    setting {
      namespace = "aws:autoscaling:launchconfiguration"
      name = "IamInstanceProfile"
      value = "aws-elasticbeanstalk-ec2-role"
    }
    setting {
      namespace = "aws:autoscaling:launchconfiguration"
      name = "SecurityGroups"
      value = aws_security_group.server-sg.id
    }
    setting {
        namespace = "aws:elasticbeanstalk:healthreporting:system"
        name      = "SystemType"
        value     = "enhanced"
    }
    setting {
      namespace = "aws:elasticbeanstalk:cloudwatch:logs"
      name = "StreamLogs"
      value = "true"
    }

    # ENVIRONMENT VARS
    setting {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = "ENVIRONMENT"
      value     = var.environment
    }
    setting {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = "PORT"
      value     = var.eb_instance_port
    }
    setting {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = "AWS_DEFAULT_REGION"
      value     = var.aws_region
    }
    setting {
      namespace = "aws:elasticbeanstalk:application:environment"
      name      = "GOOGLE_APPLICATION_CREDENTIALS"
      value     = var.google_application_creds
    }

}
